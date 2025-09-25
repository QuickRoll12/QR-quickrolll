const getWebRTCIPs = () => {
    return new Promise((resolve, reject) => {
        const ips = new Set();
        
        // Create RTCPeerConnection with STUN servers
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        });

        // Handle ICE candidate events
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                // Extract IP addresses from candidate string
                const ipMatch = /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/;
                const match = event.candidate.candidate.match(ipMatch);
                if (match) {
                    ips.add(match[1]);
                }
            } else {
                // ICE gathering complete
                pc.close();
                resolve(Array.from(ips));
            }
        };

        // Create data channel (required to start ICE gathering)
        pc.createDataChannel("");

        // Create offer to start ICE gathering
        pc.createOffer()
            .then(offer => pc.setLocalDescription(offer))
            .catch(reject);

        // Set timeout to prevent hanging
        setTimeout(() => {
            pc.close();
            resolve(Array.from(ips));
        }, 5000);
    });
};

export default getWebRTCIPs;
