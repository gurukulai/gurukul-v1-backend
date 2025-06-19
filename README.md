# 🎓 Gurukul Backend

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

<p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
<p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
<a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
<a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
<a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>

## 📖 Description

Gurukul Backend is an intelligent educational platform built with [NestJS](https://github.com/nestjs/nest) that provides AI-powered learning experiences. The platform features:

- 🤖 **AI Personas**: Custom AI personalities including Priya, an intelligent learning assistant
- 💬 **WhatsApp Integration**: Seamless communication through WhatsApp
- 📝 **Conversation Summarization**: Smart summarization of learning conversations
- 🔍 **RAG (Retrieval-Augmented Generation)**: Enhanced AI responses with context retrieval
- 👤 **User Management**: Complete user authentication and profile management
- 🧠 **LLM Integration**: Advanced language model capabilities

## 🏗️ Project Structure

```
src/
├── ai-personas/          # AI personality configurations
│   ├── config/           # Persona settings
│   └── training-data/    # Training examples
├── whatsapp/             # WhatsApp integration
├── summarization/        # Conversation summarization
├── rag/                  # Retrieval-Augmented Generation
├── llm/                  # Language model services
├── user/                 # User management
├── services/             # Shared services
└── prisma/               # Database schema and migrations
```

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- PostgreSQL database
- Supabase account (for vector storage)

### Installation

```bash
# Clone the repository
git clone https://github.com/gurukulai/gurukul-v1-backend.git
cd gurukul-v1-backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Environment Configuration

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/gurukul"

# OpenAI
OPENAI_API_KEY="your-openai-api-key"

# Supabase
SUPABASE_URL="your-supabase-url"
SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"

# WhatsApp (if using)
WHATSAPP_API_KEY="your-whatsapp-api-key"
```

### Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database (if applicable)
npx prisma db seed
```

## 🏃‍♂️ Running the Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run start:prod

# Debug mode
npm run start:debug
```

The application will be available at `http://localhost:3000`

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

## 🔧 Development

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format

# Type checking
npx tsc --noEmit
```

### Git Hooks

The project uses Husky for pre-commit hooks that automatically:

- Format code with Prettier
- Run linting checks

## 📚 Key Features

### AI Personas

- **Priya**: Intelligent learning assistant with natural conversation abilities
- Customizable personality traits and responses
- Context-aware conversations with 50-message history
- Training data optimization for natural interactions

### WhatsApp Integration

- Seamless messaging through WhatsApp Business API
- Message persistence and conversation tracking
- Automated responses with AI personas

### Conversation Management

- Smart summarization of long conversations
- Context preservation across sessions
- Enhanced response quality through RAG

## 🤝 Contributing

Please read our [Collaboration Guide](./COLLABORATION_GUIDE.md) for detailed information on:

- Setting up the development environment
- Code standards and conventions
- Git workflow and branching strategy
- Troubleshooting common issues

### Quick Setup for Contributors

```bash
# Automated setup (recommended)
curl -O https://raw.githubusercontent.com/gurukulai/gurukul-v1-backend/main/collaborator_setup.sh
chmod +x collaborator_setup.sh
./collaborator_setup.sh
```

## 📖 Documentation

- [Improving Priya AI](./IMPROVING_PRIYA.md) - Recent AI improvements and optimizations
- [Collaboration Guide](./COLLABORATION_GUIDE.md) - Development workflow and guidelines
- [API Documentation](./docs/api.md) - API endpoints and usage (if available)

## 🚀 Deployment

### Vercel Deployment

The project includes `vercel.json` configuration for easy deployment on Vercel:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Other Platforms

For other deployment options, check out the [NestJS deployment documentation](https://docs.nestjs.com/deployment).

## 📄 License

This project is [MIT licensed](LICENSE).

## 🆘 Support

- 📖 [NestJS Documentation](https://docs.nestjs.com)
- 💬 [Discord Community](https://discord.gg/G7Qnnhy)
- 🐛 [GitHub Issues](https://github.com/gurukulai/gurukul-v1-backend/issues)

## 🔗 Related Projects

- [Gurukul Frontend](https://github.com/raghavg93/gurukul-v1-frontend) - React-based chat interface

---

Built with ❤️ using [NestJS](https://nestjs.com/)
