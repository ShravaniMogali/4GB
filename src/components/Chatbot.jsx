import { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { FaRobot } from '@react-icons/all-files/fa/FaRobot';
import { FaTimes } from '@react-icons/all-files/fa/FaTimes';
import { FaMinus } from '@react-icons/all-files/fa/FaMinus';

const Chatbot = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const messagesEndRef = useRef(null);

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI('YOUR_API_KEY');
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async () => {
        if (!input.trim()) return;

        const userMessage = input.trim();
        setInput('');
        setIsLoading(true);

        // Add user message to chat
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

        try {
            // Prepare the context for the model
            const context = `You are an AI assistant for AgriLedger, a farm-to-table transparency platform. 
            You can help with:
            1. Supply chain status and tracking
            2. Product details and origin information
            3. Market prices and trends
            4. Weather updates
            5. Farming best practices
            6. Recording farm activities
            7. Smart contract information
            
            Current user query: ${userMessage}`;

            const result = await model.generateContent(context);
            const response = await result.response;
            const text = response.text();

            // Add AI response to chat
            setMessages(prev => [...prev, { role: 'assistant', content: text }]);
        } catch (error) {
            console.error('Error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.'
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Floating Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 bg-green-600 text-white p-4 rounded-full shadow-lg hover:bg-green-700 transition-all duration-300 flex items-center justify-center z-50"
                    style={{
                        width: '60px',
                        height: '60px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}
                >
                    <FaRobot style={{ fontSize: '24px' }} />
                </button>
            )}

            {/* Chat Interface */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 w-96 bg-white rounded-lg shadow-lg transition-all duration-300 z-50">
                    <div className="p-4 border-b flex justify-between items-center bg-green-600 text-white rounded-t-lg">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <FaRobot style={{ fontSize: '20px' }} />
                            AgriLedger Assistant
                        </h3>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-white hover:text-gray-200"
                            >
                                <FaMinus style={{ fontSize: '18px' }} />
                            </button>
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    setMessages([]);
                                }}
                                className="text-white hover:text-gray-200"
                            >
                                <FaTimes style={{ fontSize: '18px' }} />
                            </button>
                        </div>
                    </div>

                    <div className="h-96 overflow-y-auto p-4">
                        {messages.map((message, index) => (
                            <div
                                key={index}
                                className={`mb-4 p-3 rounded-lg ${message.role === 'user'
                                    ? 'bg-blue-100 ml-auto'
                                    : 'bg-gray-100'
                                    }`}
                            >
                                {message.content}
                            </div>
                        ))}
                        {isLoading && (
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-4 border-t">
                        <div className="flex">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder="Ask about your farm, supply chain, or market prices..."
                                className="flex-1 p-2 border rounded-l-lg focus:outline-none"
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={isLoading}
                                className="bg-green-600 text-white px-4 py-2 rounded-r-lg hover:bg-green-700 disabled:opacity-50"
                            >
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Chatbot; 