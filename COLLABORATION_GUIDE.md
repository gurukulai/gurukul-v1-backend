# 👥 Collaboration Guide for Gurukul V1 Project

## 🎯 Project Overview
This project consists of two repositories:
- **Backend**: NestJS API with Priya AI improvements
- **Frontend**: React chat application

## 🚀 Quick Setup for New Collaborators

### Option 1: Automated Setup (Recommended)
```bash
# Download and run the setup script
curl -O https://raw.githubusercontent.com/gurukulai/gurukul-v1-backend/main/collaborator_setup.sh
chmod +x collaborator_setup.sh
./collaborator_setup.sh
```

### Option 2: Manual Setup
```bash
# Create project directory
mkdir -p ~/V1Gurukul && cd ~/V1Gurukul

# Clone repositories
git clone https://github.com/gurukulai/gurukul-v1-backend.git
git clone https://github.com/raghavg93/gurukul-v1-frontend.git

# Install dependencies
cd gurukul-v1-backend && npm install && cd ..
cd gurukul-v1-frontend && npm install && cd ..
```

## 🔄 Development Workflow

### Starting the Application
```bash
# Terminal 1 - Backend (Port 3000)
cd ~/V1Gurukul/gurukul-v1-backend
npm run start:dev

# Terminal 2 - Frontend (Port 8080)
cd ~/V1Gurukul/gurukul-v1-frontend
npm start
```

### Making Changes

#### 1. Always Pull Latest Changes First
```bash
git pull origin main  # or master depending on branch
```

#### 2. Create Feature Branches
```bash
git checkout -b feature/your-feature-name
```

#### 3. Make Your Changes
- Edit files as needed
- Test your changes locally

#### 4. Commit and Push
```bash
git add .
git commit -m "Descriptive commit message"
git push origin feature/your-feature-name
```

#### 5. Create Pull Request
- Go to GitHub repository
- Click "New Pull Request"
- Add description of changes
- Request review from team members

## 📁 Project Structure

```
~/V1Gurukul/
├── gurukul-v1-backend/           # NestJS Backend
│   ├── src/
│   │   ├── ai-personas/          # Priya AI configuration
│   │   ├── whatsapp/             # WhatsApp integration
│   │   ├── summarization/        # Conversation summarization
│   │   └── ...
│   ├── IMPROVING_PRIYA.md        # Recent AI improvements
│   └── COLLABORATION_GUIDE.md    # This file
│
└── gurukul-v1-frontend/          # React Frontend
    ├── src/
    ├── public/
    └── ...
```

## 🔧 Key Files to Know

### Backend Important Files:
- `src/ai-personas/config/personas.json` - Priya's configuration
- `src/ai-personas/training-data/priya.json` - Training examples
- `IMPROVING_PRIYA.md` - Recent improvements documentation

### Frontend Important Files:
- `src/components/` - React components
- `src/services/` - API communication

## 📋 Coding Standards

### Git Commit Messages
- Use present tense: "Add feature" not "Added feature"
- Be descriptive but concise
- Reference issues when applicable: "Fix conversation history bug (#123)"

### Code Style
- Follow existing code formatting
- Add comments for complex logic
- Update documentation when needed

## 🐛 Troubleshooting

### Common Issues:
1. **Port conflicts**: Make sure backend (3000) and frontend (8080) ports are free
2. **Dependencies**: Run `npm install` after pulling changes
3. **Environment variables**: Check if `.env` files are needed

### Getting Help:
- Check existing issues on GitHub
- Review `IMPROVING_PRIYA.md` for recent changes
- Ask questions in team communication channels

## 📚 Recent Improvements (Summary)
- Enhanced Priya's training data with real conversation examples
- Increased conversation history from 10 to 50 messages
- Added conversation summarization for better context
- Improved naturalness and reduced overuse of pet names
- Fixed WhatsApp integration to use enhanced responses

## 🎯 Next Steps
1. Test the improved Priya AI
2. Gather user feedback
3. Iterate on conversation quality
4. Add new features as needed

---
Happy coding! 🚀 