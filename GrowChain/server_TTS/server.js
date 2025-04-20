import 'dotenv/config';
import express from 'express';
import axios from 'axios';
import { GoogleAuth } from 'google-auth-library';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 4005;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Dialogflow configuration
const projectId = 'englishbot-vayt';
const languageCode = 'en';

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Global error handler:', err.stack);
    res.status(500).json({ 
        error: 'Something went wrong!',
        details: err.message 
    });
});

// Function to get access token from service account JSON file
async function getAccessToken() {
    try {
        // Path to your service account JSON file
        const keyFilePath = path.join(__dirname, 'service-account-key.json');
        
        if (!fs.existsSync(keyFilePath)) {
            throw new Error('Service account key file not found. Please place your service-account-key.json file in the html_Files directory.');
        }

        const auth = new GoogleAuth({
            keyFile: keyFilePath,
            scopes: 'https://www.googleapis.com/auth/cloud-platform',
        });
        
        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();
        return accessToken.token;
    } catch (error) {
        console.error('Error getting access token:', error);
        throw error;
    }
}

// Endpoint to communicate with Dialogflow
app.post('/dialogflow', async (req, res) => {
    try {
        const { text, sessionId } = req.body;
        console.log('Received request:', { text, sessionId });

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        const accessToken = await getAccessToken();
        console.log('Got access token');

        const dialogflowUrl = `https://dialogflow.googleapis.com/v2/projects/${projectId}/agent/sessions/${sessionId || 'default-session'}:detectIntent`;

        console.log('Sending request to Dialogflow:', dialogflowUrl);

        const response = await axios.post(dialogflowUrl, {
            queryInput: {
                text: {
                    text,
                    languageCode,
                },
            },
        }, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        // Remove webhook status from response to prevent frontend errors
        const { webhookStatus, ...responseData } = response.data;
        console.log('Dialogflow response:', responseData);
        res.json(responseData);
    } catch (error) {
        console.error('Dialogflow error:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });
        
        res.status(error.response?.status || 500).json({
            error: 'Error communicating with Dialogflow',
            details: error.response?.data || error.message
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
