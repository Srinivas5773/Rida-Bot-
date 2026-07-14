# WhatsApp AI Assistant

A WhatsApp bot built with Node.js that uses AI to respond to messages.

## Features

- AI-powered responses using Groq
- Multi-language support (English, Hindi)
- Web interface for QR code scanning
- Birthday wishes automation
- Real-time status monitoring

## Setup

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with:
   ```
   GROQ_API_KEY=your_groq_api_key_here
   ```
4. Run the bot:
   ```bash
   npm start
   ```

## Environment Variables

- `GROQ_API_KEY`: Your Groq API key for AI responses
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)

## Deployment

This app is configured for Render deployment. Simply connect your GitHub repository to Render and it will deploy automatically.

## Usage

1. Visit `http://localhost:3000/qr` to scan the QR code
2. Connect your WhatsApp account
3. Start messaging with the AI assistant

## Built by Rida Owasis
