import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';

const VoiceInput = ({ onResult, className = '', buttonLabel = '🎤 Voice Input', placeholder = 'Speak now...', dialogflowSession = 'farmer-session' }) => {
  const [listening, setListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [dialogflowResponse, setDialogflowResponse] = useState('');
  const recognitionRef = useRef(null);

  const isSpeechSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const startListening = () => {
    if (!isSpeechSupported) {
      toast.error('Speech recognition not supported in this browser.');
      return;
    }
    setDialogflowResponse('');
    setRecognizedText('');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setRecognizedText(text);
      sendToDialogflow(text);
      if (onResult) onResult(text);
    };
    recognition.onerror = (event) => {
      toast.error('Speech recognition error: ' + event.error);
      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
    };
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const sendToDialogflow = async (text) => {
    try {
      const response = await fetch('/dialogflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sessionId: dialogflowSession })
      });
      if (!response.ok) throw new Error('Dialogflow error');
      const data = await response.json();
      let fulfillment = data.queryResult?.fulfillmentText || 'No response';
      setDialogflowResponse(fulfillment);
    } catch (err) {
      toast.error('Failed to get Dialogflow response');
      setDialogflowResponse('Error contacting Dialogflow');
    }
  };

  return (
    <div className={`voice-input-widget ${className}`} style={{ margin: '1rem 0' }}>
      <button
        type="button"
        className={`btn ${listening ? 'btn-secondary' : 'btn-primary'}`}
        onClick={listening ? stopListening : startListening}
        disabled={!isSpeechSupported}
      >
        {buttonLabel} {listening ? ' (Stop)' : ''}
      </button>
      <div className="recognized-text" style={{ marginTop: 8, minHeight: 24, color: '#333' }}>
        {listening && <span>{placeholder}</span>}
        {!listening && recognizedText && <span><strong>You said:</strong> {recognizedText}</span>}
      </div>
      {dialogflowResponse && (
        <div className="dialogflow-response" style={{ marginTop: 8, color: '#2fd18c' }}>
          <strong>Assistant:</strong> {dialogflowResponse}
        </div>
      )}
    </div>
  );
};

export default VoiceInput;
