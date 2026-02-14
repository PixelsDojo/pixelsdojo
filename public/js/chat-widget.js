// AI Chat Widget - Client-Side JavaScript

class ChatWidget {
  constructor() {
    this.isOpen = false;
    this.messages = [];
    this.init();
  }

  init() {
    this.createWidget();
    this.attachEventListeners();
    this.showWelcomeMessage();
  }

  createWidget() {
    const widgetHTML = `
      <div class="chat-widget-container">
        <button class="chat-toggle-button" id="chatToggle" aria-label="Toggle chat">
  <img src="/images/ninja head no background.png" alt="Dojo" style="width:65px; height:65px;">
</button>
        
        <div class="chat-window" id="chatWindow">
          <div class="chat-header">
            <h3>
              <span>🥋</span>
              <span>Pixels Dojo Assistant</span>
            </h3>
            <button class="chat-close" id="chatClose" aria-label="Close chat">&times;</button>
          </div>
          
          <div class="chat-messages" id="chatMessages">
            <!-- Messages will appear here -->
          </div>
          
          <div class="chat-input-container">
            <div class="chat-input-wrapper">
              <textarea 
                class="chat-input" 
                id="chatInput" 
                placeholder="Ask me anything about Pixels Online..."
                rows="1"
              ></textarea>
              <button class="chat-send-button" id="chatSend" aria-label="Send message">
                ➤
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', widgetHTML);
  }

  attachEventListeners() {
    const toggleBtn = document.getElementById('chatToggle');
    const closeBtn = document.getElementById('chatClose');
    const sendBtn = document.getElementById('chatSend');
    const input = document.getElementById('chatInput');

    toggleBtn.addEventListener('click', () => this.toggleChat());
    closeBtn.addEventListener('click', () => this.closeChat());
    sendBtn.addEventListener('click', () => this.sendMessage());
    
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Auto-resize textarea
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    });
  }

  toggleChat() {
    const chatWindow = document.getElementById('chatWindow');
    this.isOpen = !this.isOpen;
    
    if (this.isOpen) {
      chatWindow.classList.add('open');
      document.getElementById('chatInput').focus();
    } else {
      chatWindow.classList.remove('open');
    }
  }

  closeChat() {
    this.isOpen = false;
    document.getElementById('chatWindow').classList.remove('open');
  }

  showWelcomeMessage() {
    const welcomeHTML = `
      <div class="welcome-message">
        <h4>👋 Welcome to Pixels Dojo!</h4>
        <p>I'm your AI assistant. Ask me anything about Pixels Online!</p>
        <div class="quick-questions">
          <button class="quick-question-btn" onclick="chatWidget.askQuickQuestion('How do I earn PIXEL tokens?')">
            💰 How do I earn $PIXEL tokens?
          </button>
          <button class="quick-question-btn" onclick="chatWidget.askQuickQuestion('Where are all the NPCs located?')">
            🗺️ Where are all the NPCs?
          </button>
          <button class="quick-question-btn" onclick="chatWidget.askQuickQuestion('What is VIP membership?')">
            ⭐ What is VIP membership?
          </button>
        </div>
      </div>
    `;
    
    document.getElementById('chatMessages').innerHTML = welcomeHTML;
  }

  askQuickQuestion(question) {
    const input = document.getElementById('chatInput');
    input.value = question;
    this.sendMessage();
  }

  async sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message to chat
    this.addMessage('user', message);
    
    // Clear input
    input.value = '';
    input.style.height = 'auto';
    
    // Show typing indicator
    this.showTypingIndicator();
    
    // Disable send button
    const sendBtn = document.getElementById('chatSend');
    sendBtn.disabled = true;
    
    try {
      // Call API
      const response = await fetch('/chat/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: message })
      });
      
      const data = await response.json();
      
      // Hide typing indicator
      this.hideTypingIndicator();
      
      if (data.success) {
        this.addMessage('bot', data.answer, data.citations);
      } else {
        this.addMessage('bot', data.error || 'Sorry, I encountered an error. Please try again!');
      }
    } catch (error) {
      console.error('Chat error:', error);
      this.hideTypingIndicator();
      this.addMessage('bot', 'Sorry, I\'m having trouble connecting. Please try again!');
    } finally {
      sendBtn.disabled = false;
      input.focus();
    }
  }

  addMessage(type, content, citations = null) {
    const messagesContainer = document.getElementById('chatMessages');
    
    // Remove welcome message if present
    const welcomeMsg = messagesContainer.querySelector('.welcome-message');
    if (welcomeMsg) {
      welcomeMsg.remove();
    }
    
  // NEW:
const avatar = type === 'user' 
  ? '👤' 
  : '<img src="/images/ninja head no background.png" style="width:100px; height:100px; border-radius:50%;">';
    const messageClass = type === 'user' ? 'user-message' : 'bot-message';
    
    let citationsHTML = '';
    if (citations && citations.length > 0) {
      citationsHTML = `
        <div class="message-citations">
          <p>📚 Related guides:</p>
          ${citations.map(c => `
            <a href="/page/${c.slug}" class="citation-link" target="_blank">
              ${c.title}
            </a>
          `).join('')}
        </div>
      `;
    }
    
    const messageHTML = `
      <div class="chat-message ${messageClass}">
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">
          ${this.formatMessage(content)}
          ${citationsHTML}
        </div>
      </div>
    `;
    
    messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    this.messages.push({ type, content, citations });
  }

  formatMessage(content) {
    // Convert markdown-style formatting to HTML
    let formatted = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
    
    return formatted;
  }

  showTypingIndicator() {
    const messagesContainer = document.getElementById('chatMessages');
    const indicatorHTML = `
      <div class="chat-message bot-message typing-indicator active" id="typingIndicator">
        <div class="message-avatar">🤖</div>
        <div class="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    `;
    
    messagesContainer.insertAdjacentHTML('beforeend', indicatorHTML);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
      indicator.remove();
    }
  }
}

// Initialize chat widget when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.chatWidget = new ChatWidget();
  });
} else {
  window.chatWidget = new ChatWidget();
}
