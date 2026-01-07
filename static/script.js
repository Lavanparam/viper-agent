const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

let messageHistory = [];

// Initialize Mermaid
mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    themeVariables: {
        darkMode: true,
        primaryColor: '#0d9488',
        lineColor: '#2dd4bf',
        textColor: '#f0fdf4',
        mainBkg: '#1e293b',
        nodeBorder: '#2dd4bf',
    }
});

// Configure Marked
marked.use({
    breaks: true, // Convert newlines to <br> in markdown
});


// Auto-resize textarea
userInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
    if (this.value === '') this.style.height = 'auto';
});

// Handle Send
async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    // Add User Message
    addMessage(text, 'user');
    userInput.value = '';
    userInput.style.height = 'auto';

    // Show Loading/Typing indicator (simple version: just wait)
    const loadingId = addLoadingIndicator();

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: text,
                history: messageHistory
            })
        });

        const data = await response.json();

        // Remove Loading
        removeMessage(loadingId);

        if (response.ok) {
            addMessage(data.response, 'agent');
            // Update history (simple approximation)
            messageHistory.push({ role: 'user', content: text });
            messageHistory.push({ role: 'model', content: data.response });
        } else {
            addMessage("Error: " + data.detail, 'agent');
        }

    } catch (error) {
        removeMessage(loadingId);
        addMessage("Network Error: " + error.message, 'agent');
    }
}

function addMessage(text, sender) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', `${sender}-message`);

    let contentHtml = '';

    if (sender === 'agent') {
        // Parse Markdown
        // Check for mermaid blocks and pre-process if necessary, 
        // but marked handles ```mermaid well as code blocks.
        // We will post-process to render mermaid.
        contentHtml = marked.parse(text);
    } else {
        // Simple formatting for user
        contentHtml = `<p>${text.replace(/\n/g, '<br>')}</p>`;
    }

    msgDiv.innerHTML = `
        <div class="message-content">
            ${contentHtml}
        </div>
    `;

    chatContainer.appendChild(msgDiv);

    // Post-processing for Agent messages
    if (sender === 'agent') {
        renderMermaidDiagrams(msgDiv);
    }

    chatContainer.scrollTop = chatContainer.scrollHeight;
    return msgDiv;
}

function renderMermaidDiagrams(container) {
    // Find all code blocks with language-mermaid
    const mermaidBlocks = container.querySelectorAll('code.language-mermaid');

    mermaidBlocks.forEach((block, index) => {
        const pre = block.parentElement; // The <pre> tag
        const code = block.textContent;
        const id = `mermaid-${Date.now()}-${index}`;

        // Create a div for mermaid to render into
        const mermaidDiv = document.createElement('div');
        mermaidDiv.classList.add('mermaid');
        mermaidDiv.id = id;
        mermaidDiv.textContent = code; // Mermaid 10+ can read textContent

        // Replace the <pre> with the div
        pre.replaceWith(mermaidDiv);
    });

    // Run mermaid on the new divs
    mermaid.run({
        querySelector: '.mermaid'
    });
}

function addLoadingIndicator() {
    const id = 'loading-' + Date.now();
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', 'agent-message');
    msgDiv.id = id;
    msgDiv.innerHTML = `
        <div class="message-content">
            <p>Analyzing...</p>
        </div>
    `;
    chatContainer.appendChild(msgDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return id;
}

function removeMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});
