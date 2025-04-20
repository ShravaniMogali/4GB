# GrowChain: Farm-to-Table Tracking System

A blockchain-based supply chain tracking system for agricultural products, featuring QR code tracking, real-time location monitoring, and voice-enabled farmer inputs.

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Docker (v19.03.0+) and Docker Compose (v1.27.0+)
- Git (v2.20.0+)

## Quick Start Guide

1. Clone the repository:

bash
git clone <repository-url>
cd farm-to-table-tracking

2. Install dependencies:

bash
npm install

3. Set up the blockchain network (In seprate terminal):

bash
npm run blockchain:setup

4. Start the blockchain API server(In seprate terminal):

bash
npm run blockchain:start

5. Run server.js for voice input (In seprate terminal ):

bash
cd server_TTS
node server.js

6. Start the development server:

bash
npm run dev

The application will be available at http://localhost:5173 (or the port shown in your terminal).

Hosted site is available at https://name-13bbb.web.app/create-consignment , but preferably setup locally for better experience and complete accessibility .

## Features

- Role-based access (Farmer, Distributor, Retailer)
- QR code generation and scanning
- Real-time location tracking
- Voice-enabled inputs
- Blockchain-based immutable records
- Mobile-friendly interface
- Mobile app ( Partial implementation using capacitor )

## Troubleshooting

If you encounter any issues:

1. Check if all ports are available
2. Verify Node.js version (v14 or higher)
3. Make sure all dependencies are installed correctly

## Support

For additional help or questions, please mail to snehamogali74@gmail.com .
