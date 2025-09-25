const axios = require('axios');
const ChatLog = require('../models/ChatLog');
const ChatbotDocument = require('../models/ChatbotDocument');
const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');

class ChatbotService {
  constructor() {
    this.openAIKey = process.env.OPENAI_API_KEY;
    this.pineconeApiKey = process.env.PINECONE_API_KEY;
    this.pineconeEnvironment = process.env.PINECONE_ENVIRONMENT;
    this.pineconeIndex = process.env.PINECONE_INDEX;
    this.embeddingModel = 'text-embedding-ada-002';
    this.chatModel = 'gpt-3.5-turbo';
  }

  async generateEmbedding(text) {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/embeddings',
        {
          input: text,
          model: this.embeddingModel
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openAIKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error.response?.data || error.message);
      throw new Error('Failed to generate embedding');
    }
  }

  async retrieveRelevantContext(query, userId) {
    try {
      // Get user information for personalization
      const User = require('../models/User');
      const user = await User.findById(userId).select('name department semester section role');
      
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);
      
      // For now, since we don't have Pinecone set up yet, we'll do a simple search
      // in our database to find relevant documents based on category and text matching
      const documents = await ChatbotDocument.find({
        $or: [
          { content: { $regex: new RegExp(query.split(' ').filter(word => word.length > 3).join('|'), 'i') } },
          { title: { $regex: new RegExp(query.split(' ').filter(word => word.length > 3).join('|'), 'i') } }
        ]
      }).limit(3);
      
      // Format results
      let context = '';
      if (documents && documents.length > 0) {
        context = documents
          .map(doc => `${doc.title}:\n${doc.content}`)
          .join('\n\n');
      }
      
      return { context, user, relevantDocuments: documents.map(doc => doc._id) };
    } catch (error) {
      console.error('Error retrieving context:', error);
      return { context: '', user: null, relevantDocuments: [] };
    }
  }

  async generateResponse(query, userId) {
    try {
      // Retrieve relevant context and user info
      const { context, user, relevantDocuments } = await this.retrieveRelevantContext(query, userId);
      
      // Create system prompt with university info
      const systemPrompt = `You are a helpful assistant for the university. Your name is Campus Assistant.
      Your goal is to provide accurate, friendly, and helpful information to students and faculty.
      
      Here is information about the university that may be relevant to the question:
      ${context || 'No specific information available for this query.'}
      
      If you don't know the answer based on the provided information, politely say so and suggest where the student might find that information.
      Always be respectful, professional, and supportive. Keep your answers concise but informative.`;
      
      // Create user prompt with personalization
      const userPrompt = user ? 
        `I am a ${user.role} with the following information:\n- Name: ${user.name}\n- Department: ${user.department || 'Not specified'}\n- Semester: ${user.semester || 'Not specified'}\n- Section: ${user.section || 'Not specified'}\n\nMy question is: ${query}` :
        `My question is: ${query}`;
      
      // Call OpenAI API
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: this.chatModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 500
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openAIKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const generatedResponse = response.data.choices[0].message.content;
      
      // Log the interaction
      await this.logInteraction({
        userId,
        query,
        response: generatedResponse,
        relevantDocuments
      });
      
      return generatedResponse;
    } catch (error) {
      console.error('Error generating response:', error.response?.data || error.message);
      throw new Error('Failed to generate response');
    }
  }

  async logInteraction(interactionData) {
    try {
      return await ChatLog.create(interactionData);
    } catch (error) {
      console.error('Error logging interaction:', error);
      // Don't throw here, just log the error
    }
  }

  async getUserChatHistory(userId, limit = 20) {
    try {
      return await ChatLog.find({ userId })
        .sort({ timestamp: -1 })
        .limit(limit);
    } catch (error) {
      console.error('Error fetching chat history:', error);
      return [];
    }
  }

  async processTextDocument(title, content, category) {
    try {
      console.log('Processing text document:', title, 'Category:', category, 'Content length:', content.length);
      
      // Create a new document in the database
      const document = await ChatbotDocument.create({
        title,
        content,
        category,
        type: 'text',
        vectorized: false // We'll set this to true once we implement vector storage
      });
      
      console.log('Text document created successfully:', document._id);
      return {
        success: true,
        documentId: document._id
      };
    } catch (error) {
      console.error('Error processing text document:', error);
      throw new Error(`Failed to process text document: ${error.message}`);
    }
  }

  async processFileDocument(file, category) {
    try {
      console.log('Processing file:', file.originalname, 'Category:', category);
      
      // Create a hash of the file to use as a unique identifier
      const fileBuffer = fs.readFileSync(file.path);
      const fileHash = createHash('md5').update(fileBuffer).digest('hex');
      
      // Determine file type
      const fileExtension = path.extname(file.originalname).toLowerCase();
      let fileType = 'text';
      let fileContent = '';
      
      if (fileExtension === '.pdf') {
        fileType = 'pdf';
        try {
          // Try to use pdf-parse if available
          const pdfParse = require('pdf-parse');
          const pdfData = await pdfParse(fileBuffer);
          fileContent = pdfData.text;
          console.log('PDF parsed successfully, content length:', fileContent.length);
        } catch (pdfError) {
          console.error('Error parsing PDF:', pdfError);
          // Fallback if pdf-parse is not available
          fileContent = `Content of PDF file: ${file.originalname} (PDF parsing failed)`;
        }
      } else if (fileExtension === '.docx') {
        fileType = 'docx';
        // For DOCX we'll just store the filename for now
        // In a production environment, you would use a DOCX parser
        fileContent = `Content of DOCX file: ${file.originalname} (DOCX parsing not implemented)`;
      } else if (fileExtension === '.txt') {
        fileContent = fileBuffer.toString('utf8');
        console.log('Text file parsed, content length:', fileContent.length);
      } else {
        throw new Error('Unsupported file type');
      }
      
      // Create a new document in the database
      console.log('Creating document in database with content length:', fileContent.length);
      const document = await ChatbotDocument.create({
        title: file.originalname,
        content: fileContent,
        category,
        type: fileType,
        filename: file.originalname,
        originalPath: file.path,
        vectorized: false
      });
      
      console.log('Document created successfully:', document._id);
      return {
        success: true,
        documentId: document._id
      };
    } catch (error) {
      console.error('Error processing file document:', error);
      throw new Error(`Failed to process file document: ${error.message}`);
    }
  }

  async deleteDocument(documentId) {
    try {
      const document = await ChatbotDocument.findById(documentId);
      
      if (!document) {
        throw new Error('Document not found');
      }
      
      // If there's a file associated with this document, delete it
      if (document.originalPath && fs.existsSync(document.originalPath)) {
        fs.unlinkSync(document.originalPath);
      }
      
      // Delete the document from the database
      await ChatbotDocument.findByIdAndDelete(documentId);
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting document:', error);
      throw new Error('Failed to delete document');
    }
  }

  async getAllDocuments() {
    try {
      return await ChatbotDocument.find()
        .sort({ createdAt: -1 });
    } catch (error) {
      console.error('Error fetching documents:', error);
      return [];
    }
  }
}

module.exports = new ChatbotService();
