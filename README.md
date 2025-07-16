# PromptLibrary - RAG-Enabled Prompt Management System

A modern, Firebase-powered platform for managing AI prompts with integrated Retrieval-Augmented Generation (RAG) capabilities.

## 🚀 Features

### ✅ MVP Features (Completed)
- **User Authentication**: Email/password and Google OAuth login
- **Prompt Management**: Create, edit, delete, and organize prompts
- **Rich Text Editor**: Advanced prompt editor with variable support
- **Document Upload**: Upload and process documents for RAG
- **Prompt Execution**: Execute prompts with AI models
- **Execution History**: Track and analyze prompt performance
- **Real-time Sync**: Firebase-powered real-time collaboration
- **Responsive UI**: Modern, mobile-friendly interface
- **Version Control**: Track prompt versions and changes

### 🔄 Coming Soon (Phase 2)
- Advanced RAG configuration
- Team workspaces and collaboration
- A/B testing framework
- REST API and webhooks
- CLI tool and VS Code extension
- Template marketplace

### 🎯 Future (Phase 3)
- Enterprise features (SSO, RBAC)
- Advanced analytics
- Multi-agent workflows
- White-label deployment

## 🏗️ Architecture

### Technology Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Firebase (Firestore, Cloud Functions, Authentication, Storage)
- **AI Integration**: LangChain + OpenAI/Anthropic APIs
- **Vector Storage**: FAISS (MVP) → Chroma/Pinecone (Scale)
- **Testing**: Vitest + Testing Library
- **Deployment**: Firebase Hosting + GitHub Actions

### Project Structure
```
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React contexts (Auth, etc.)
│   │   ├── services/       # API and Firebase services
│   │   ├── types/          # TypeScript type definitions
│   │   └── test/           # Test utilities and setup
│   ├── public/             # Static assets
│   └── dist/               # Built application
├── functions/              # Firebase Cloud Functions (Python)
├── docs/                   # Project documentation
├── scripts/                # Deployment and utility scripts
├── firebase.json           # Firebase configuration
├── firestore.rules         # Firestore security rules
└── storage.rules           # Cloud Storage security rules
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- Firebase CLI
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd React-App-000730
   ```

2. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Install Firebase CLI**
   ```bash
   npm install -g firebase-tools
   ```

4. **Login to Firebase**
   ```bash
   firebase login
   ```

5. **Set up environment variables**
   ```bash
   cp frontend/.env.example frontend/.env
   # Edit .env with your Firebase configuration
   ```

### Development

1. **Start the development server**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Start Firebase emulators** (optional)
   ```bash
   firebase emulators:start
   ```

3. **Run tests**
   ```bash
   cd frontend
   npm run test
   ```

### Deployment

1. **Build the application**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy to Firebase**
   ```bash
   # Deploy to development
   ./scripts/deploy.sh development
   
   # Deploy to staging
   ./scripts/deploy.sh staging
   
   # Deploy to production
   ./scripts/deploy.sh production
   ```

## 📖 Usage

### Creating Your First Prompt

1. **Sign up/Login** using email or Google account
2. **Navigate to Prompts** page
3. **Click "New Prompt"** to create a prompt
4. **Fill in the details**:
   - Title and description
   - Prompt content with variables (use `{{variable_name}}`)
   - Tags and category
   - Variable definitions
5. **Save** your prompt
6. **Execute** the prompt with different inputs

### Document Upload for RAG

1. **Go to Documents** page
2. **Click "Upload Documents"**
3. **Drag and drop** or select files (PDF, TXT, DOC, DOCX, MD)
4. **Wait for processing** - documents will be chunked and indexed
5. **Use RAG** in prompt execution for context-aware responses

### Prompt Execution

1. **Select a prompt** from your library
2. **Click "Execute"** button
3. **Fill in variables** if any are defined
4. **Configure settings** (model, temperature, etc.)
5. **Enable RAG** if you want to use uploaded documents
6. **Click "Execute Prompt"** to get AI response
7. **View results** with performance metrics

## 🧪 Testing

The project includes comprehensive testing setup:

```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in UI mode
npm run test:ui
```

## 📊 Performance

### Current Metrics (MVP)
- **Build Time**: ~30 seconds
- **Bundle Size**: ~2MB (gzipped)
- **First Load**: <3 seconds
- **Prompt Execution**: <2 seconds average
- **Document Processing**: <30 seconds per document

### Optimization Targets
- Bundle size reduction through code splitting
- Caching strategies for better performance
- Database query optimization
- CDN integration for global performance

## 🔒 Security

### Implemented Security Measures
- Firebase Authentication with secure rules
- Firestore security rules for data isolation
- Input validation and sanitization
- HTTPS-only communication
- Environment variable protection

### Security Best Practices
- Regular dependency updates
- Security audits and penetration testing
- Proper error handling without information leakage
- Rate limiting on API endpoints
- Data encryption at rest and in transit

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write tests for new features
- Use conventional commit messages
- Update documentation as needed
- Ensure all tests pass before submitting

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Firebase team for the excellent platform
- LangChain community for RAG capabilities
- React and TypeScript communities
- All beta testers and contributors

## 📞 Support

- **Documentation**: Check the `/docs` folder for detailed guides
- **Issues**: Report bugs and request features via GitHub Issues
- **Discussions**: Join our community discussions
- **Email**: Contact the development team

---

**Built with ❤️ by the PromptLibrary Team**

*Making AI prompt management simple, powerful, and collaborative.*
