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
});

// --- Toolbar Logic ---

const fileUpload = document.getElementById('file-upload');
const uploadBtn = document.getElementById('upload-btn');
const clearBtn = document.getElementById('clear-btn');
const exportBtn = document.getElementById('export-btn');
const exportMenu = document.getElementById('export-menu');
const exportPdf = document.getElementById('export-pdf');
const exportDocx = document.getElementById('export-docx');

// Upload
uploadBtn.addEventListener('click', () => fileUpload.click());

fileUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    // Show uploading...
    const loadingId = addLoadingIndicator();

    try {
        const res = await fetch('/upload', { method: 'POST', body: formData });
        const data = await res.json();
        removeMessage(loadingId);

        if (res.ok) {
            // Success: Send content as a hidden system/user message context
            addMessage(`Uploaded: ${data.filename}`, 'user');

            // Send to Agent
            // Context injection: "Content of uploaded file [name]: \n [text]"
            const contextMsg = `I have uploaded a file named "${data.filename}". Here is the content:\n\n${data.content}\n\nPlease analyze this content.`;

            // Call sendMessage logic manually
            // We reuse the sendMessage logic but bypass UI input
            messageHistory.push({ role: 'user', content: contextMsg });

            const agentLoadingId = addLoadingIndicator();
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: contextMsg, history: messageHistory })
            });

            const agentData = await response.json();
            removeMessage(agentLoadingId);

            if (response.ok) {
                addMessage(agentData.response, 'agent');
                messageHistory.push({ role: 'model', content: agentData.response });
            } else {
                addMessage("Error analyzing file: " + agentData.detail, 'agent');
            }

        } else {
            addMessage("Upload failed: " + data.detail, 'agent');
        }
    } catch (err) {
        removeMessage(loadingId);
        addMessage("Upload Error: " + err.message, 'agent');
    }

    // Reset input
    fileUpload.value = '';
});

// Clear Chat
clearBtn.addEventListener('click', () => {
    if (confirm("Are you sure you want to clear the chat?")) {
        messageHistory = [];
        chatContainer.innerHTML = '';
        // Restore welcome message
        const welcome = document.createElement('div');
        welcome.classList.add('message', 'agent-message');
        welcome.innerHTML = '<div class="message-content"><p>Chat cleared. Waiting for new game theory scenario.</p></div>';
        chatContainer.appendChild(welcome);
    }
});

// Export Menu Toggle
exportBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    exportMenu.classList.toggle('hidden');
});

// Auto-hide on mouse leave
const exportWrapper = document.querySelector('.export-wrapper');
if (exportWrapper) {
    exportWrapper.addEventListener('mouseleave', () => {
        exportMenu.classList.add('hidden');
    });
}

document.addEventListener('click', () => {
    exportMenu.classList.add('hidden');
});

// Export Handlers
async function handleExport(format) {
    if (messageHistory.length === 0) {
        alert("No chat history to export.");
        return;
    }

    try {
        const res = await fetch('/export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ history: messageHistory, format: format })
        });

        if (res.ok) {
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `viper-chat.${format}`; // .pdf or .docx
            document.body.appendChild(a);
            a.click();
            a.remove();
        } else {
            const text = await res.text();
            alert("Export failed: " + text);
        }
    } catch (err) {
        alert("Export error: " + err.message);
    }
}

exportPdf.addEventListener('click', () => handleExport('pdf'));
exportDocx.addEventListener('click', () => handleExport('docx'));
