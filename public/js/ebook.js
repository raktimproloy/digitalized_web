const Colors = {
  light: {
    text: '#0a0a0a',
    background: '#F0F0F0',
    tint: '#017a47',
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: '#017a47',
    primary: '#017a47',
    secondary: '#016a3e',
    border: '#e2e2e2',
    card: '#ffffff',
    cardBorder: 'rgba(1, 122, 71, 0.1)',
    error: '#FF3B30',
    shadow: 'rgba(1, 122, 71, 0.1)',
  },
  dark: {
    text: '#ffffff',
    background: '#121212',
    tint: '#017a47',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#017a47',
    primary: '#017a47',
    secondary: '#018d52',
    border: '#3b3b3b',
    card: '#212121',
    cardBorder: 'rgba(1, 122, 71, 0.18)',
    error: '#FF453A',
    shadow: 'rgba(1, 122, 71, 0.12)',
  },
};

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r}, ${g}, ${b}`;
}

const ebookData = window.ebookData;
const userId = window.userId;
const initialUserNotes = window.initialUserNotes || [];
const isSharedView = window.isSharedView || false;
const sharedBy = window.sharedBy || null;
const shareInfo = window.shareInfo || null;
// Normalize notes: ensure id field exists (map _id to id if needed)
// Preserve original id if it exists, otherwise use _id
let userNotes = initialUserNotes.map(note => {
    const normalized = { ...note };
    // If note has _id but no id field, use _id as id
    // Otherwise, preserve the existing id field
    if (normalized._id && !normalized.id) {
        normalized.id = normalized._id.toString();
    }
    // Keep _id for reference but use id as primary identifier
    return normalized;
});
let notesChanged = false;
let noteIdCounter = Date.now();
let currentEditingNote = null;
let currentHighlightId = null;
let selectedText = null;
let selectedPosition = null;
let addNoteMode = false;
let highlightMode = false;
let highlightColor = '#ffff00';

// Show shared view banner
function showSharedViewBanner() {
    const banner = document.createElement('div');
    banner.id = 'shared-view-banner';
    banner.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: linear-gradient(135deg, #017a47 0%, #019d5a 100%);
        color: white;
        padding: 12px 20px;
        text-align: center;
        z-index: 100000;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        font-size: 14px;
        font-weight: 500;
    `;
    const ownerName = sharedBy?.name || sharedBy?.phoneNumber || 'User';
    banner.innerHTML = `
        <span>👤 Viewing notes shared by <strong>${escapeHtml(ownerName)}</strong></span>
        <span style="margin-left: 10px; opacity: 0.8; font-size: 12px;">(Read-only mode)</span>
    `;
    document.body.insertBefore(banner, document.body.firstChild);
    
    // Adjust body padding to account for banner
    document.body.style.paddingTop = '50px';
}

function getParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    theme: params.get('theme') || 'light',
    token: params.get('token') || '',
    id: params.get('id') || '',
  };
}

function applyTheme(themeName) {
  const theme = Colors[themeName] || Colors.light;
  const primaryRgb = hexToRgb(theme.primary);
  const cardRgb = hexToRgb(theme.card);
  
  const glassEffect = `
    background: rgba(${cardRgb}, 0.85) !important;
    backdrop-filter: blur(12px) !important;
    -webkit-backdrop-filter: blur(12px) !important;
    border: 1px solid rgba(${themeName === 'dark' ? '255,255,255' : '0,0,0'}, 0.1) !important;
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37) !important;
  `;

  const css = `
    body { background: ${theme.background} !important; color: ${theme.text} !important; }
    .ebook-container { background: transparent !important; border: none !important; box-shadow: none !important; }
    .ebook-title { color: ${theme.text} !important; border-bottom: 3px solid ${theme.tint} !important; }
    .chapter { background: transparent !important; border-left: none !important; }
    .chapter-title { color: ${theme.text} !important; }
    
    /* Glass Effect Elements */
    .note-popup,
    .highlight-palette,
    .highlight-menu,
    .note-modal,
    .note-form-popup,
    .sticky-popup-inner,
    #global-sticky-popup {
        ${glassEffect}
    }

    /* Match arrow color to glass background */
    .sticky-popup-inner::before,
    #global-sticky-popup::before {
        border-bottom-color: rgba(${cardRgb}, 0.85) !important;
    }

    /* Ensure inner elements don't block glass effect */
    .note-modal-header, 
    .note-modal-actions,
    .sticky-note-header {
        background: transparent !important;
        border-color: rgba(${themeName === 'dark' ? '255,255,255' : '0,0,0'}, 0.1) !important;
    }

    .note-popup .note-title { color: ${theme.text} !important; border-bottom: 2px solid ${theme.tint} !important; }
    .sticky-note { background: ${theme.secondary} !important; border-color: #fff !important; }
    
    .highlight-no-note, .user-highlight.highlight-no-note {
        /* No specific overrides needed, falls back to default highlight styles */
    }

    .highlight-has-note, .user-highlight.highlight-has-note {
        background: transparent !important;
        font-weight: bold !important;
        /* Border color logic handled in updateHighlightStyles for user highlights */
    }

    /* Disable hover effects for note highlights */
    .highlight.highlight-has-note:hover, .user-highlight.highlight-has-note:hover {
        transform: none !important;
        box-shadow: none !important;
        background: transparent !important;
    }

    ${themeName === 'dark' ? `
        .highlight:not(.highlight-has-note) { background: rgba(${primaryRgb}, 0.25) !important; color: ${theme.text} !important; }
        .highlight:not(.highlight-has-note):hover { background: rgba(${primaryRgb}, 0.30) !important; }
        .highlight.highlight-has-note { border-bottom: 2px dotted ${theme.primary} !important; }
        .highlight.active { 
            background: rgba(${primaryRgb}, 0.40) !important; 
            color: inherit !important;
            border-bottom: 2px solid ${theme.primary} !important;
            box-shadow: 0 0 8px rgba(${primaryRgb}, 0.4) !important;
        }
        .note-form-popup { border-top-color: ${theme.primary} !important; }
        .note-modal-header { background: rgba(${primaryRgb}, 0.06) !important; }
      ` : `
        .highlight:not(.highlight-has-note) { background: linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%) !important; }
        .highlight.highlight-has-note { border-bottom: 2px dotted ${theme.primary} !important; }
        .highlight.active {
            background: rgba(${primaryRgb}, 0.30) !important;
            color: inherit !important;
            border-bottom: 2px solid ${theme.primary} !important;
            box-shadow: 0 0 8px rgba(${primaryRgb}, 0.3) !important;
        }
      `}

    /* Highlight Menu & Palette Styling */
    .highlight-menu, .highlight-palette {
        background: ${themeName === 'dark' ? 'rgba(30, 30, 30, 0.85)' : 'rgba(255, 255, 255, 0.85)'} !important;
        backdrop-filter: blur(12px) !important;
        -webkit-backdrop-filter: blur(12px) !important;
        border: 1px solid ${themeName === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} !important;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2) !important;
        padding: 6px !important;
        border-radius: 12px !important;
        gap: 6px !important;
        transition: opacity 0.2s ease, transform 0.2s ease !important;
        opacity: 0.9 !important;
    }

    .highlight-menu:hover, .highlight-menu:active, .highlight-menu:focus-within,
    .highlight-palette:hover, .highlight-palette:active, .highlight-palette:focus-within {
        opacity: 1 !important;
        transform: scale(1.02) !important;
    }

    .highlight-menu-btn {
        width: 28px !important;
        height: 28px !important;
        font-size: 14px !important;
        padding: 4px !important;
        color: ${theme.text} !important;
    }
    
    .highlight-menu-btn:hover {
        background: ${themeName === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'} !important;
    }

    /* Add Note Button Theme Integration */
    .add-note-btn {
        background-color: ${theme.primary} !important;
        color: #fff !important;
        border: none !important;
    }
  `;
  let style = document.getElementById('theme-overrides');
  if (!style) {
    style = document.createElement('style');
    style.id = 'theme-overrides';
    document.head.appendChild(style);
  }
  style.textContent = css;
  
  // Update highlight classes after theme application
  setTimeout(updateHighlightStyles, 100);
}

function renderContent() {
    // Show shared view banner if in shared view
    if (isSharedView && sharedBy) {
        showSharedViewBanner();
    }
    
    // Hide FAB menu in shared view (read-only mode)
    if (isSharedView) {
        const fabContainer = document.querySelector('.fab-container');
        if (fabContainer) {
            fabContainer.style.display = 'none';
        }
    }
    
    // Check if this is a topic view
    if (window.isTopic) {
        // Render topic content
        const topicContentDiv = document.getElementById('content-topic');
        if (topicContentDiv) {
            // Content is already rendered from EJS as HTML, just process highlights and KaTeX
            processExistingContent(topicContentDiv);
        }
        return;
    }
    
    // Render main content if it exists
    const mainContentDiv = document.getElementById('content-main');
    if (mainContentDiv) {
        // Content is already rendered from EJS as HTML, just process highlights and KaTeX
        processExistingContent(mainContentDiv);
    }
    
    // Render chapter content
    if (ebookData.chapters && ebookData.chapters.length > 0) {
        ebookData.chapters.forEach(chapter => {
            const contentDiv = document.getElementById(`content-${chapter.id}`);
            if (!contentDiv) return;
            
            // If content is already rendered from EJS (has HTML), process highlights and KaTeX
            // Otherwise, if chapter has content, process and render it
            if (contentDiv.innerHTML.trim() !== '') {
                // Content already exists (from EJS), process highlights and KaTeX
                processExistingContent(contentDiv);
            } else if (chapter.content) {
                // No content yet, render from chapter.content
                processAndRenderContent(contentDiv, chapter.content);
            }
        });
    }
}

function processAndRenderContent(contentDiv, content) {
    let processedContent = content;
    
    // Process highlight patterns: *text*@term@, *text*, @term@
    // onclick="showNote(...)" disabled - commented out for now
    // processedContent = processedContent.replace(
    //     /\*([^*]+)\*@([^@]+)@/g,
    //     '<span class="highlight" data-term="$2" data-display="$1" onclick="showNote(\'$2\', this)">$1</span>'
    // );
    // processedContent = processedContent.replace(
    //     /\*([^*]+)\*/g,
    //     '<span class="highlight" data-term="$1" onclick="showNote(\'$1\', this)">$1</span>'
    // );
    // processedContent = processedContent.replace(
    //     /@([^@]+)@/g,
    //     '<span class="highlight" data-term="$1" onclick="showNote(\'$1\', this)">$1</span>'
    // );
    
    // Set innerHTML to render HTML content
    contentDiv.innerHTML = processedContent;
    
    // Render KaTeX after HTML is inserted
    renderMathInElement(contentDiv, {
        delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false},
            {left: '\\[', right: '\\]', display: true},
            {left: '\\(', right: '\\)', display: false}
        ],
        throwOnError: false
    });
}

function processExistingContent(contentDiv) {
    // Process highlights in existing HTML content
    let html = contentDiv.innerHTML;
    
    // Process highlight patterns in the HTML
    // onclick="showNote(...)" disabled - commented out for now
    // html = html.replace(
    //     /\*([^*]+)\*@([^@]+)@/g,
    //     '<span class="highlight" data-term="$2" data-display="$1" onclick="showNote(\'$2\', this)">$1</span>'
    // );
    // html = html.replace(
    //     /\*([^*]+)\*/g,
    //     '<span class="highlight" data-term="$1" onclick="showNote(\'$1\', this)">$1</span>'
    // );
    // html = html.replace(
    //     /@([^@]+)@/g,
    //     '<span class="highlight" data-term="$1" onclick="showNote(\'$1\', this)">$1</span>'
    // );
    
    contentDiv.innerHTML = html;
    
    // Render KaTeX on the processed content
    renderMathInElement(contentDiv, {
        delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false},
            {left: '\\[', right: '\\]', display: true},
            {left: '\\(', right: '\\)', display: false}
        ],
        throwOnError: false
    });
}

function showNote(term, element) {
    const notePopup = document.getElementById('notePopup');
    const noteTitle = document.getElementById('noteTitle');
    const noteContent = document.getElementById('noteContent');
    const termLower = term.toLowerCase();
    let note = ebookData.notes[termLower];
    if (!note) {
        for (const key in ebookData.notes) {
            if (key.toLowerCase() === termLower) {
                note = ebookData.notes[key];
                break;
            }
        }
    }
    if (note) {
        const displayText = element ? element.getAttribute('data-display') : null;
        noteTitle.textContent = displayText || term;
        noteContent.textContent = note;
        notePopup.style.top = '';
        notePopup.style.left = '';
        notePopup.classList.add('active');
        document.querySelectorAll('.highlight').forEach(el => {
            el.classList.remove('active');
        });
        const clickedElement = element || window.event.target;
        clickedElement.classList.add('active');
    }
}

function closeNote() {
    const notePopup = document.getElementById('notePopup');
    notePopup.classList.remove('active');
    document.querySelectorAll('.highlight').forEach(el => {
        el.classList.remove('active');
    });
}

document.addEventListener('click', function(event) {
    const notePopup = document.getElementById('notePopup');
    if (notePopup && !notePopup.contains(event.target) &&
        !event.target.classList.contains('highlight')) {
        closeNote();
    }
});

function toggleFabMenu() {
    const btn = document.getElementById('addNoteBtn');
    const options = document.getElementById('fabOptions');
    btn.classList.toggle('active');
    options.classList.toggle('active');
}

function triggerAddNote() {
    addNoteMode = !addNoteMode;
    toggleFabMenu();
    const container = document.querySelector('.ebook-container');
    container.style.cursor = addNoteMode ? 'crosshair' : 'default';
}

function triggerHighlight() {
    const palette = document.getElementById('highlightPalette');
    const wasActive = palette.classList.contains('active');
    toggleFabMenu();
    if (!wasActive) {
        palette.classList.add('active');
        highlightMode = true;
        updateHighlightCursor();
    } else {
        closeHighlightPalette();
    }
}

function closeHighlightPalette() {
    document.getElementById('highlightPalette').classList.remove('active');
    highlightMode = false;
    updateHighlightCursor();
}

function setHighlightColor(color) {
    highlightColor = color;
    
    // If we have a stored selection, apply highlight immediately
    if (window.currentSelectionRange) {
        const range = window.currentSelectionRange;
        const text = window.currentSelectionText;
        const chapterContent = range.commonAncestorContainer.nodeType === 1
            ? range.commonAncestorContainer.closest('.chapter-content')
            : range.commonAncestorContainer.parentElement.closest('.chapter-content');
            
        if (chapterContent) {
            createHighlight(range, text, highlightColor, chapterContent);
            
            // Clear selection and hide palette
            window.getSelection().removeAllRanges();
            window.currentSelectionRange = null;
            window.currentSelectionText = null;
            document.getElementById('highlightPalette').classList.remove('active');
        }
    }
    
    // Update active state of color buttons
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.classList.remove('active');
        const temp = document.createElement('div');
        temp.style.color = color;
        document.body.appendChild(temp);
        const computedColor = window.getComputedStyle(temp).color;
        document.body.removeChild(temp);
        if (btn.style.backgroundColor === computedColor ||
            btn.getAttribute('onclick').includes(color)) {
            btn.classList.add('active');
        }
    });
}

function updateHighlightCursor() {
    const container = document.querySelector('.ebook-container');
    container.style.cursor = highlightMode ? 'text' : 'default';
}

function triggerShare() {
    toggleFabMenu();
    if (navigator.share) {
        navigator.share({
            title: document.title,
            url: window.location.href
        }).catch(console.error);
    } else {
        alert('Share URL: ' + window.location.href);
    }
}

function initializeNotesSystem() {
    const container = document.querySelector('.ebook-container');
    container.addEventListener('click', function(e) {
        if (!e.target.closest('.sticky-note') && !e.target.closest('#global-sticky-popup')) {
            collapseAllNotes();
        }
        if (!addNoteMode) return;
        if (e.target.closest('.sticky-note') ||
            e.target.closest('.add-note-btn') ||
            e.target.closest('.fab-container') ||
            e.target.closest('.note-form-popup')) return;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        showNoteForm(x, y);
    });
    initializeHighlightSystem();
    makePaletteDraggable();
}

function makePaletteDraggable() {
    const palette = document.getElementById('highlightPalette');
    const handle = palette.querySelector('.palette-handle');
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;
    handle.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);
    handle.addEventListener('touchstart', dragStart, {passive: false});
    document.addEventListener('touchmove', drag, {passive: false});
    document.addEventListener('touchend', dragEnd);
    function dragStart(e) {
        if (e.type === 'touchstart') {
            initialX = e.touches[0].clientX - xOffset;
            initialY = e.touches[0].clientY - yOffset;
        } else {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
        }
        if (e.target === handle) {
            isDragging = true;
        }
    }
    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            if (e.type === 'touchmove') {
                currentX = e.touches[0].clientX - initialX;
                currentY = e.touches[0].clientY - initialY;
            } else {
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
            }
            xOffset = currentX;
            yOffset = currentY;
            setTranslate(currentX, currentY, palette);
        }
    }
    function setTranslate(xPos, yPos, el) {
        el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
    }
    function dragEnd() {
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
    }
}

function initializeHighlightSystem() {
    // Show palette on text selection using selectionchange for better mobile support
    document.addEventListener('selectionchange', debounce(handleSelectionChange, 300));
    
    // Also keep mouseup/touchend for immediate response on clicks outside
    document.addEventListener('mouseup', (e) => handleSelectionEnd(e));
    document.addEventListener('touchend', (e) => setTimeout(() => handleSelectionEnd(e), 100));
}

let selectionTimeout;
let lastInteractionTarget = null;

function initializeHighlightSystem() {
    // Track interaction target to prevent unwanted closing
    document.addEventListener('mousedown', (e) => lastInteractionTarget = e.target);
    document.addEventListener('touchstart', (e) => lastInteractionTarget = e.target);

    // Show palette on text selection using selectionchange for better mobile support
    document.addEventListener('selectionchange', debounce(handleSelectionChange, 300));
    
    // Also keep mouseup/touchend for immediate response on clicks outside
    document.addEventListener('mouseup', (e) => handleSelectionEnd(e));
    document.addEventListener('touchend', (e) => setTimeout(() => handleSelectionEnd(e), 100));
}

function debounce(func, wait) {
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(selectionTimeout);
            func(...args);
        };
        clearTimeout(selectionTimeout);
        selectionTimeout = setTimeout(later, wait);
    };
}

function handleSelectionChange() {
    handleSelectionEnd(null);
}

function handleSelectionEnd(e) {
    const selection = window.getSelection();
    const target = e ? e.target : lastInteractionTarget;
    
    // Check if we interacted with the palette or FAB controls
    if (target && target.closest) {
        if (target.closest('#highlightPalette') || 
            target.closest('.fab-container') || 
            target.closest('.color-btn')) {
            return;
        }
    }

    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        // Hide palette
        document.getElementById('highlightPalette').classList.remove('active');
        window.currentSelectionRange = null;
        window.currentSelectionText = null;
        return;
    }

    const text = selection.toString().trim();
    if (text.length > 0) {
        // Show palette (use CSS positioning)
        const range = selection.getRangeAt(0);
        const palette = document.getElementById('highlightPalette');
        
        // Reset any inline styles
        palette.style.left = '';
        palette.style.top = '';
        palette.style.display = ''; 
        
        palette.classList.add('active');
        
        // Store the range
        window.currentSelectionRange = range;
        window.currentSelectionText = text;
    }
}

function handleHighlightSelection() {
    // Deprecated in favor of on-demand highlighting via palette
}

function createHighlight(range, text, color, container) {
    const preSelectionRange = document.createRange();
    preSelectionRange.selectNodeContents(container);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    const startOffset = preSelectionRange.toString().length;
    const endOffset = startOffset + text.length;
    const chapterId = container.id.replace('content-', '');
    const highlight = {
        id: 'highlight_' + Date.now(),
        type: 'highlight',
        text: text,
        color: color,
        chapterId: chapterId,
        startOffset: startOffset,
        endOffset: endOffset,
        createdAt: new Date().toISOString()
    };
    wrapRange(range, highlight.id, color);
    userNotes.push(highlight);
    notesChanged = true;
    triggerAutosave();
    updateHighlightStyles();
    setTimeout(() => {
        const el = document.querySelector(`.user-highlight[data-id="${highlight.id}"]`);
        if (el) {
            const rect = el.getBoundingClientRect();
            const event = { clientX: rect.left + rect.width/2, clientY: rect.top };
            showHighlightMenu(event, highlight.id);
        }
    }, 50);
}

function wrapRange(range, id, color) {
    try {
        const span = document.createElement('span');
        span.className = 'user-highlight';
        const finalColor = color || '#ffff00'; // Default to yellow if color not provided
        span.style.setProperty('background-color', finalColor, 'important');
        span.dataset.id = id;
        span.dataset.color = color || '#ffff00'; // Store color in dataset as backup
        span.onclick = (e) => handleHighlightClick(e, id);
        try {
            range.surroundContents(span);
        } catch (e) {
            span.appendChild(range.extractContents());
            range.insertNode(span);
        }
        console.log('🎨 Wrapped range with highlight:', { id, color, backgroundColor: span.style.backgroundColor });
    } catch (e) {
        console.error('Failed to highlight:', e);
    }
}

function handleHighlightClick(e, id) {
    e.stopPropagation();
    const highlight = userNotes.find(n => n.id === id);
    if (highlight && highlight.note) {
        // Directly open note if it exists
        openNoteModal(id);
    } else {
        // Show menu if no note
        showHighlightMenu(e, id);
    }
}

function showHighlightMenu(e, id) {
    const menu = document.getElementById('highlightMenu');
    const highlight = userNotes.find(n => n.id === id);
    if (!highlight) return;
    currentHighlightId = id;
    let html = '';
    if (highlight.note) {
        html += `<button class="highlight-menu-btn view" onclick="openNoteModal('${id}')" title="View Note">👁️</button>`;
        html += `<button class="highlight-menu-btn delete" onclick="removeHighlight('${id}'); hideHighlightMenu()" title="Delete">❌</button>`;
    } else {
         html += `<button class="highlight-menu-btn add" onclick="addNoteToHighlight('${id}')" title="Add Note">AI</button>`;
        html += `<button class="highlight-menu-btn add" onclick="addNoteToHighlight('${id}')" title="Add Note">➕</button>`;
        html += `<button class="highlight-menu-btn delete" onclick="removeHighlight('${id}'); hideHighlightMenu()" title="Delete">❌</button>`;
    }
    menu.innerHTML = html;
    menu.classList.remove('hidden');
    
    // Get dimensions after showing
    const menuRect = menu.getBoundingClientRect();
    const menuWidth = menuRect.width;
    
    let x, y;
    if (e.clientX && e.clientY) {
        x = e.clientX;
        y = e.clientY;
    } else {
        const el = document.querySelector(`.user-highlight[data-id="${id}"]`);
        if (el) {
            const rect = el.getBoundingClientRect();
            x = rect.left + (rect.width / 2);
            y = rect.top;
        } else {
            x = window.innerWidth / 2;
            y = window.innerHeight / 2;
        }
    }
    
    // Calculate position (centered on x)
    let leftPos = x - (menuWidth / 2);
    let topPos = y - 50;
    
    // Screen boundaries
    const padding = 10;
    const windowWidth = window.innerWidth;
    
    // Clamp horizontal position
    if (leftPos < padding) {
        leftPos = padding;
    } else if (leftPos + menuWidth > windowWidth - padding) {
        leftPos = windowWidth - menuWidth - padding;
    }
    
    // Adjust vertical if too close to top
    if (topPos < padding) {
        const el = document.querySelector(`.user-highlight[data-id="${id}"]`);
        if (el) {
             const rect = el.getBoundingClientRect();
             topPos = rect.bottom + 10;
        } else {
             topPos = y + 20;
        }
    }
    
    menu.style.position = 'fixed';
    menu.style.left = `${leftPos}px`;
    menu.style.top = `${topPos}px`;
}

function openNoteModal(id) {
    const highlight = userNotes.find(n => n.id === id);
    if (!highlight || !highlight.note) return;
    document.getElementById('highlightMenu').classList.add('hidden');
    currentHighlightId = id;
    const headerEl = document.querySelector('.note-modal-header h3');
    if (headerEl) headerEl.textContent = 'Highlight Note';
    document.getElementById('noteModalContent').innerHTML = escapeHtml(highlight.note);
    document.getElementById('noteModalOverlay').classList.add('active');
}

function closeNoteModal() {
    document.getElementById('noteModalOverlay').classList.remove('active');
    currentHighlightId = null;
}

document.getElementById('noteModalOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'noteModalOverlay') {
        closeNoteModal();
    }
});

function editHighlightNote() {
    if (!currentHighlightId) return;
    document.getElementById('noteModalOverlay').classList.remove('active');
    addNoteToHighlight(currentHighlightId);
}

function deleteHighlightNote() {
    if (!currentHighlightId) return;
    if (confirm('Delete this note? (Highlight will remain)')) {
        const highlight = userNotes.find(n => n.id === currentHighlightId);
        if (highlight) {
            delete highlight.note;
            highlight.updatedAt = new Date().toISOString();
            notesChanged = true;
            triggerAutosave();
            updateHighlightStyles();
        }
        closeNoteModal();
    }
}

function hideHighlightMenu() {
    document.getElementById('highlightMenu').classList.add('hidden');
    currentHighlightId = null;
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('#highlightMenu') &&
        !e.target.closest('.user-highlight') &&
        !e.target.closest('#noteFormPopup') &&
        !e.target.closest('#noteModalOverlay')) {
        hideHighlightMenu();
    }
});

function addNoteToHighlight(id) {
    hideHighlightMenu();
    currentHighlightId = id;
    const highlight = userNotes.find(n => n.id === id);
    const el = document.querySelector(`.user-highlight[data-id="${id}"]`);
    let x = 0, y = 0;
    if (el) {
        const rect = el.getBoundingClientRect();
        const container = document.querySelector('.ebook-container');
        const containerRect = container.getBoundingClientRect();
        x = rect.left - containerRect.left;
        y = rect.top - containerRect.top;
    }
    showNoteForm(x, y);
    if (highlight && highlight.note) {
        document.getElementById('noteFormText').value = highlight.note;
    }
}

function removeHighlight(id) {
    userNotes = userNotes.filter(n => n.id !== id);
    const spans = document.querySelectorAll(`.user-highlight[data-id="${id}"]`);
    spans.forEach(span => {
        const parent = span.parentNode;
        while (span.firstChild) parent.insertBefore(span.firstChild, span);
        parent.removeChild(span);
    });
    notesChanged = true;
    triggerAutosave();
}

function renderUserHighlights() {
    const highlights = userNotes.filter(n => n.type === 'highlight');
    console.log('🔍 Rendering highlights:', highlights.length, highlights);
    highlights.forEach(h => {
        let container = null;
        
        // For topic view, use content-topic container
        if (window.isTopic) {
            container = document.getElementById('content-topic');
        } else if (h.chapterId) {
            // For regular ebook, use chapter-based container
            container = document.getElementById(`content-${h.chapterId}`);
        } else {
            // Fallback to main content
            container = document.getElementById('content-main');
        }
        
        if (!container) {
            console.warn('Container not found for highlight:', h);
            return;
        }
        
        // Use id field (prefer original id, fallback to _id)
        // The id field should be preserved from when it was created (e.g., "highlight_1234567890")
        // If not, use _id as fallback
        let highlightId = h.id;
        if (!highlightId && h._id) {
            highlightId = h._id.toString();
            console.warn('⚠️ Highlight missing id, using _id:', highlightId, h);
        }
        if (!highlightId) {
            console.error('❌ Highlight missing both id and _id:', h);
            return;
        }
        
        console.log('📍 Restoring highlight:', {
            id: highlightId,
            hasNote: !!h.note,
            note: h.note,
            startOffset: h.startOffset,
            endOffset: h.endOffset,
            color: h.color,
            chapterId: h.chapterId
        });
        
        // Ensure color is set, default to yellow if missing
        const highlightColor = h.color || '#ffff00';
        restoreHighlight(container, h.startOffset, h.endOffset, highlightId, highlightColor);
    });
    // Update styles after a longer delay to ensure all highlights are restored and DOM is ready
    // Also wait for KaTeX to finish processing
    setTimeout(() => {
        updateHighlightStyles();
        // Force re-apply colors to all highlights to ensure they're visible
        document.querySelectorAll('.user-highlight').forEach(el => {
            const dataColor = el.getAttribute('data-color');
            const currentBg = el.style.backgroundColor;
            // If no background color or transparent, apply color from data-color or find from userNotes
            if (!currentBg || currentBg === 'transparent' || currentBg === 'rgba(0, 0, 0, 0)') {
                const id = el.dataset.id;
                const highlight = userNotes.find(n => n.id === id || (n._id && n._id.toString() === id));
                const colorToApply = highlight?.color || dataColor || '#ffff00';
                el.style.setProperty('background-color', colorToApply, 'important');
                console.log('🔧 Force applied color to highlight:', { id, color: colorToApply });
            }
        });
    }, 500);
}

function restoreHighlight(container, start, end, id, color) {
    const range = document.createRange();
    let currentOffset = 0;
    let startNode = null, startOffsetVal = 0;
    let endNode = null, endOffsetVal = 0;
    function walk(node) {
        if (node.nodeType === 3) {
            const len = node.length;
            if (!startNode && currentOffset + len >= start) {
                startNode = node;
                startOffsetVal = start - currentOffset;
            }
            if (!endNode && currentOffset + len >= end) {
                endNode = node;
                endOffsetVal = end - currentOffset;
                return true;
            }
            currentOffset += len;
        } else {
            for (let i = 0; i < node.childNodes.length; i++) {
                if (walk(node.childNodes[i])) return true;
            }
        }
        return false;
    }
    walk(container);
    if (startNode && endNode) {
        range.setStart(startNode, startOffsetVal);
        range.setEnd(endNode, endOffsetVal);
        wrapRange(range, id, color);
        console.log('✅ Highlight restored:', { id, color, start, end, startNode: startNode.textContent.substring(0, 20), endNode: endNode.textContent.substring(0, 20) });
    } else {
        console.error('❌ Failed to restore highlight - nodes not found:', { id, color, start, end, container: container.id });
    }
}

function showNoteForm(x, y) {
    const popup = document.getElementById('noteFormPopup');
    const textarea = document.getElementById('noteFormText');
    selectedPosition = { x, y };
    textarea.value = '';
    popup.style.left = '';
    popup.style.top = '';
    popup.classList.add('active');
    textarea.focus();
}

function cancelNoteForm() {
    document.getElementById('noteFormPopup').classList.remove('active');
    selectedPosition = null;
    currentEditingNote = null;
}

function saveNoteForm() {
    const text = document.getElementById('noteFormText').value.trim();
    if (!text) return;
    try {
        if (currentHighlightId) {
            const highlight = userNotes.find(n => n.id === currentHighlightId);
            if (highlight) {
                highlight.note = text;
                highlight.updatedAt = new Date().toISOString();
                // Update styles immediately to show border
                updateHighlightStyles();
                // Also directly update the element to ensure border shows
                const el = document.querySelector(`.user-highlight[data-id="${currentHighlightId}"]`);
                if (el && highlight.color) {
                    el.style.setProperty('background-color', 'transparent', 'important');
                    el.style.setProperty('border-bottom', `2px solid ${highlight.color}`, 'important');
                    el.classList.remove('highlight-no-note');
                    el.classList.add('highlight-has-note');
                }
            }
            currentHighlightId = null;
        } else if (currentEditingNote) {
            currentEditingNote.content = text;
            currentEditingNote.updatedAt = new Date().toISOString();
            const noteEl = document.getElementById(`note-${currentEditingNote.id}`);
            if (noteEl) {
                const contentEl = noteEl.querySelector('.sticky-note-content');
                if (contentEl) {
                    contentEl.textContent = text;
                }
                // Also update expanded popup if it's open
                const globalPopup = document.getElementById('global-sticky-popup');
                if (globalPopup && noteEl.classList.contains('expanded')) {
                    const popupContent = globalPopup.querySelector('.sticky-note-content');
                    if (popupContent) {
                        popupContent.textContent = text;
                    }
                }
            }
            currentEditingNote = null;
        } else {
            if (!selectedPosition) {
                console.error('No position selected for new note');
                return;
            }
            const newNote = {
                id: 'note_' + Date.now(),
                content: text,
                x: selectedPosition.x,
                y: selectedPosition.y,
                createdAt: new Date().toISOString()
            };
            userNotes.push(newNote);
            renderSingleNote(newNote);
        }
        notesChanged = true;
        triggerAutosave();
    } catch (error) {
        console.error('Error saving note:', error);
        alert('Error saving note. See console for details.');
    } finally {
        cancelNoteForm();
        addNoteMode = false;
        const container = document.querySelector('.ebook-container');
        if (container) container.style.cursor = 'default';
    }
}

function renderUserNotes() {
    const layer = document.getElementById('notesLayer');
    if (!layer) return;
    layer.innerHTML = '';
    const notes = userNotes.filter(n => n.type !== 'highlight');
    notes.forEach(renderSingleNote);
}

function renderSingleNote(note) {
    if (note.type === 'highlight') return;
    const layer = document.getElementById('notesLayer');
    const noteEl = document.createElement('div');
    noteEl.className = 'sticky-note';
    noteEl.id = `note-${note.id}`;
    noteEl.style.left = (note.x || 0) + 'px';
    noteEl.style.top = (note.y || 0) + 'px';
    noteEl.addEventListener('click', function(e) {
        e.stopPropagation();
        if (noteEl.classList.contains('dragging')) return;
        if (e.target.closest('.note-btn')) return;
        
        // Toggle behavior: Close if already open, otherwise open
        if (noteEl.classList.contains('expanded')) {
            collapseAllNotes();
        } else {
            expandNote(note.id);
        }
    });
    
    // In shared view, hide edit/delete buttons and show shared indicator
    const actionsHtml = isSharedView 
        ? `<div class="sticky-note-actions">
            <span class="shared-badge" title="Shared by ${sharedBy?.name || 'User'}">👤 Shared</span>
          </div>`
        : `<div class="sticky-note-actions">
            <button class="note-btn edit" data-note-id="${note.id}">✏️</button>
            <button class="note-btn delete" data-note-id="${note.id}">🗑️</button>
          </div>`;
    
    noteEl.innerHTML = `
        ${!isSharedView ? '<div class="drag-handle-indicator">✥</div>' : ''}
        <div class="sticky-popup-inner">
            <div class="sticky-note-header">
                <span class="sticky-note-title">Note <span class="sticky-badge">Sticky</span></span>
                ${actionsHtml}
            </div>
            <div class="sticky-note-content">${escapeHtml(note.content)}</div>
        </div>
    `;
    
    // Only add event listeners and make draggable if not in shared view
    if (!isSharedView) {
        const editBtn = noteEl.querySelector('.note-btn.edit');
        const deleteBtn = noteEl.querySelector('.note-btn.delete');
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                editNote(note.id);
            });
        }
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteNote(note.id);
            });
        }
        makeDraggable(noteEl, note.id);
    }
    
    layer.appendChild(noteEl);
}

function expandNote(id) {
    collapseAllNotes(); // Close others
    
    const noteEl = document.getElementById(`note-${id}`);
    if (!noteEl) return;
    
    // Create or get global popup
    let globalPopup = document.getElementById('global-sticky-popup');
    if (!globalPopup) {
        globalPopup = document.createElement('div');
        globalPopup.id = 'global-sticky-popup';
        globalPopup.className = 'sticky-popup-inner global-popup';
        // Apply glass effect style class if needed, or rely on CSS
        document.body.appendChild(globalPopup);
        
        // Add click listener to prevent closing when clicking inside
        globalPopup.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    // Copy content from the note
    const innerContent = noteEl.querySelector('.sticky-popup-inner');
    if (innerContent) {
        globalPopup.innerHTML = innerContent.innerHTML;
        
        // Re-attach event listeners for edit and delete buttons in expanded popup (only if not shared view)
        if (!isSharedView) {
            const editBtn = globalPopup.querySelector('.note-btn.edit');
            const deleteBtn = globalPopup.querySelector('.note-btn.delete');
            if (editBtn) {
                const noteId = editBtn.getAttribute('data-note-id');
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    editNote(noteId);
                });
            }
            if (deleteBtn) {
                const noteId = deleteBtn.getAttribute('data-note-id');
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteNote(noteId);
                });
            }
        }
    }
    
    // Position the popup
    const rect = noteEl.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    globalPopup.style.display = 'flex';
    globalPopup.style.opacity = '1';
    globalPopup.style.pointerEvents = 'auto';
    globalPopup.style.position = 'absolute';
    globalPopup.style.top = (rect.bottom + scrollTop + 12) + 'px'; // 12px gap
    globalPopup.style.left = '50%';
    globalPopup.style.transform = 'translateX(-50%)';
    
    // Calculate arrow offset to point to the icon
    const iconCenter = rect.left + rect.width / 2;
    const screenCenter = window.innerWidth / 2;
    const arrowOffset = iconCenter - screenCenter;
    globalPopup.style.setProperty('--arrow-offset', arrowOffset + 'px');

    noteEl.classList.add('expanded');
}

function collapseAllNotes() {
    const globalPopup = document.getElementById('global-sticky-popup');
    if (globalPopup) {
        globalPopup.style.display = 'none';
        globalPopup.style.opacity = '0';
        globalPopup.style.pointerEvents = 'none';
    }
    document.querySelectorAll('.sticky-note').forEach(el => {
        el.classList.remove('expanded');
    });
}

function makeDraggable(element, noteId) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    let holdTimer = null;
    let isDragMode = false;
    element.onmousedown = onPointerDown;
    element.ontouchstart = onPointerDown;
    element.oncontextmenu = function(e) {
        if (isDragMode) {
            e.preventDefault();
            return false;
        }
    };
    function onPointerDown(e) {
        if (e.target.closest('.note-btn')) return;
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        pos3 = clientX;
        pos4 = clientY;
        isDragMode = false;
        holdTimer = setTimeout(() => {
            startDragMode(e);
        }, 200);
        if (e.type.includes('touch')) {
            document.addEventListener('touchmove', checkCancelHold, {passive: false});
            document.addEventListener('touchend', cancelHold);
        } else {
            document.addEventListener('mousemove', checkCancelHold);
            document.addEventListener('mouseup', cancelHold);
        }
    }
    function startDragMode(e) {
        isDragMode = true;
        element.classList.add('dragging');
        if (navigator.vibrate) navigator.vibrate(50);
        cleanupCheckListeners();
        if (e.type.includes('touch')) {
            document.addEventListener('touchmove', elementDrag, {passive: false});
            document.addEventListener('touchend', closeDragElement);
        } else {
            document.addEventListener('mousemove', elementDrag);
            document.addEventListener('mouseup', closeDragElement);
        }
    }
    function checkCancelHold(e) {
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        if (Math.abs(clientX - pos3) > 10 || Math.abs(clientY - pos4) > 10) {
            cancelHold();
        }
    }
    function cancelHold() {
        if (holdTimer) clearTimeout(holdTimer);
        cleanupCheckListeners();
        isDragMode = false;
    }
    function cleanupCheckListeners() {
        document.removeEventListener('mousemove', checkCancelHold);
        document.removeEventListener('mouseup', cancelHold);
        document.removeEventListener('touchmove', checkCancelHold);
        document.removeEventListener('touchend', cancelHold);
    }
    function elementDrag(e) {
        if (!isDragMode) return;
        e.preventDefault();
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        pos1 = pos3 - clientX;
        pos2 = pos4 - clientY;
        pos3 = clientX;
        pos4 = clientY;
        let newTop = (element.offsetTop - pos2);
        let newLeft = (element.offsetLeft - pos1);
        const container = document.querySelector('.ebook-container');
        const containerRect = container.getBoundingClientRect();
        if (newLeft < 0) newLeft = 0;
        if (newLeft + element.offsetWidth > containerRect.width) {
            newLeft = containerRect.width - element.offsetWidth;
        }
        if (newTop < 0) newTop = 0;
        if (newTop + element.offsetHeight > containerRect.height) {
            newTop = containerRect.height - element.offsetHeight;
        }
        element.style.top = newTop + 'px';
        element.style.left = newLeft + 'px';
    }
    function closeDragElement() {
        document.removeEventListener('mousemove', elementDrag);
        document.removeEventListener('mouseup', closeDragElement);
        document.removeEventListener('touchmove', elementDrag);
        document.removeEventListener('touchend', closeDragElement);
        element.classList.remove('dragging');
        isDragMode = false;
        
        // Update note position in userNotes after drag ends
        const note = userNotes.find(n => n.id === noteId);
        if (note) {
            const rect = element.getBoundingClientRect();
            const container = document.querySelector('.ebook-container');
            const containerRect = container.getBoundingClientRect();
            note.x = rect.left - containerRect.left;
            note.y = rect.top - containerRect.top;
            notesChanged = true;
            triggerAutosave();
        }
    }
}

function editNote(id) {
    const note = userNotes.find(n => n.id === id);
    if (!note) return;
    currentEditingNote = note;
    document.getElementById('noteFormText').value = note.content;
    const noteEl = document.getElementById(`note-${id}`);
    const rect = noteEl.getBoundingClientRect();
    const popup = document.getElementById('noteFormPopup');
    popup.style.left = rect.left + 'px';
    popup.style.top = rect.top + 'px';
    popup.classList.add('active');
}

function deleteNote(id) {
    if (!confirm('Delete this note?')) return;
    userNotes = userNotes.filter(n => n.id !== id);
    const noteEl = document.getElementById(`note-${id}`);
    if (noteEl) noteEl.remove();
    notesChanged = true;
    triggerAutosave();
}

let autosaveTimer = null;

function triggerAutosave() {
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
        saveNotesToServer();
    }, 1000);
}

function showSaveProgress() {
    const progressBar = document.getElementById('saveProgressBar');
    if (progressBar) {
        progressBar.classList.add('active');
    }
}

function hideSaveProgress() {
    const progressBar = document.getElementById('saveProgressBar');
    if (progressBar) {
        progressBar.classList.remove('active');
    }
}

async function saveNotesToServer() {
    if (!userId) {
        console.error('Cannot save: User ID is missing');
        return;
    }
    
    // Show progress bar
    showSaveProgress();
    
    try {
        const requestBody = { 
            notes: userNotes, 
            userId: userId 
        };
        
        // Include topicId if available (for topic-based notes)
        if (window.topicId) {
            requestBody.topicId = window.topicId;
        }
        
        const response = await fetch('/api/user-notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        const result = await response.json();
        if (response.ok) {
            notesChanged = false;
        } else {
            alert('Failed to save notes: ' + (result.error || response.statusText));
        }
    } catch (error) {
        console.error('Error autosaving:', error);
    } finally {
        // Hide progress bar after a short delay to show completion
        setTimeout(() => {
            hideSaveProgress();
        }, 300);
    }
}

function updateHighlightStyles() {
    // 1. Process pre-existing highlights (.highlight)
    document.querySelectorAll('.highlight').forEach(el => {
        const term = el.textContent.trim().toLowerCase();
        let hasNote = false;
        if (ebookData && ebookData.notes) {
            if (ebookData.notes[term]) {
                hasNote = true;
            } else {
                 for (const key in ebookData.notes) {
                    if (key.toLowerCase() === term) {
                        hasNote = true;
                        break;
                    }
                }
            }
        }
        
        if (hasNote) {
            el.classList.remove('highlight-no-note');
            el.classList.add('highlight-has-note');
        } else {
            el.classList.add('highlight-no-note');
            el.classList.remove('highlight-has-note');
        }
    });

    // 2. Process user highlights (.user-highlight)
    document.querySelectorAll('.user-highlight').forEach(el => {
        const id = el.dataset.id;
        // Find highlight by id (already normalized from _id if needed)
        let highlight = userNotes.find(n => {
            // Match by id field (normalized)
            if (n.id === id) return true;
            // Fallback: match by _id if id doesn't match
            if (n._id && (n._id.toString() === id || n._id === id)) return true;
            return false;
        });
        
        // Get color from dataset first (set during wrapRange), then from highlight, then fallback
        const dataColor = el.getAttribute('data-color');
        const existingBgColor = el.style.backgroundColor;
        
        if (highlight) {
            // Check if highlight has a note (handle both 'note' field and any note-related fields)
            const hasNote = highlight.note && highlight.note.trim().length > 0;
            // Get color from highlight, fallback to dataset color, then existing style, then default
            const highlightColor = highlight.color || dataColor || existingBgColor || '#ffff00';
            
            console.log('🎨 Updating highlight style:', {
                id: id,
                highlightId: highlight.id,
                hasNote: hasNote,
                note: highlight.note,
                color: highlightColor,
                dataColor: dataColor,
                existingBg: existingBgColor
            });
            
            if (hasNote) {
                // Has note: Show as border-bottom
                el.classList.remove('highlight-no-note');
                el.classList.add('highlight-has-note');
                el.style.setProperty('background-color', 'transparent', 'important');
                el.style.setProperty('border-bottom', `2px solid ${highlightColor}`, 'important');
            } else {
                // No note: Show as background highlight
                el.classList.add('highlight-no-note');
                el.classList.remove('highlight-has-note');
                // Ensure color is always applied with important to override any CSS
                const finalColor = highlightColor || dataColor || '#ffff00';
                el.style.setProperty('background-color', finalColor, 'important');
                el.style.borderBottom = 'none';
            }
        } else {
            console.warn('⚠️ Highlight not found in userNotes for id:', id, 'Available IDs:', userNotes.map(n => n.id || n._id));
            // If highlight not found in userNotes, preserve the color from dataset or existing style
            const preservedColor = dataColor || existingBgColor || '#ffff00';
            // Always apply color - never leave it transparent or empty
            if (preservedColor && preservedColor !== 'transparent' && preservedColor !== 'rgba(0, 0, 0, 0)') {
                el.style.setProperty('background-color', preservedColor, 'important');
                el.style.borderBottom = 'none';
            } else {
                // Fallback to yellow if no valid color found
                el.style.setProperty('background-color', '#ffff00', 'important');
                el.style.borderBottom = 'none';
            }
            // Mark as no-note since we don't have the highlight data
            el.classList.add('highlight-no-note');
            el.classList.remove('highlight-has-note');
        }
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function initializePage() {
    const params = getParams();
    window.pageParams = params;
    applyTheme(params.theme);
    renderContent();
    
    // Wait for content to be fully rendered before restoring notes and highlights
    setTimeout(function() {
        try {
            initializeNotesSystem();
            // Render user notes (sticky notes)
            renderUserNotes();
            // Render user highlights (text highlights) - wait a bit more for KaTeX to finish
            setTimeout(() => {
                renderUserHighlights();
                console.log('✅ User notes and highlights restored:', {
                    notesCount: userNotes.filter(n => n.type !== 'highlight').length,
                    highlightsCount: userNotes.filter(n => n.type === 'highlight').length,
                    isTopic: window.isTopic,
                    topicId: window.topicId
                });
            }, 300);
        } catch (e) {
            console.error('Error initializing user data:', e);
        }
        const testBtn = document.getElementById('addNoteBtn');
        if (testBtn) {
            testBtn.addEventListener('click', function() {});
        }
    }, 500); // Increased timeout to ensure content and KaTeX are fully rendered
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', function() {
        initializePage();
    });
} else {
    initializePage();
}
