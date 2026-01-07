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
let userNotes = [...initialUserNotes];
let notesChanged = false;
let noteIdCounter = Date.now();
let currentEditingNote = null;
let currentHighlightId = null;
let selectedText = null;
let selectedPosition = null;
let addNoteMode = false;
let highlightMode = false;
let highlightColor = '#ffff00';

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
    ebookData.chapters.forEach(chapter => {
        const contentDiv = document.getElementById(`content-${chapter.id}`);
        if (!contentDiv) return;
        let processedContent = chapter.content;
        processedContent = processedContent.replace(
            /\*([^*]+)\*@([^@]+)@/g,
            '<span class="highlight" data-term="$2" data-display="$1" onclick="showNote(\'$2\', this)">$1</span>'
        );
        processedContent = processedContent.replace(
            /\*([^*]+)\*/g,
            '<span class="highlight" data-term="$1" onclick="showNote(\'$1\', this)">$1</span>'
        );
        processedContent = processedContent.replace(
            /@([^@]+)@/g,
            '<span class="highlight" data-term="$1" onclick="showNote(\'$1\', this)">$1</span>'
        );
        contentDiv.innerHTML = processedContent;
        renderMathInElement(contentDiv, {
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false},
                {left: '\\[', right: '\\]', display: true},
                {left: '\\(', right: '\\)', display: false}
            ],
            throwOnError: false
        });
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
        span.style.backgroundColor = color;
        span.dataset.id = id;
        span.onclick = (e) => handleHighlightClick(e, id);
        try {
            range.surroundContents(span);
        } catch (e) {
            span.appendChild(range.extractContents());
            range.insertNode(span);
        }
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
    highlights.forEach(h => {
        const container = document.getElementById(`content-${h.chapterId}`);
        if (!container) return;
        restoreHighlight(container, h.startOffset, h.endOffset, h.id, h.color);
    });
    updateHighlightStyles();
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
                updateHighlightStyles();
            }
            currentHighlightId = null;
        } else if (currentEditingNote) {
            currentEditingNote.content = text;
            currentEditingNote.updatedAt = new Date().toISOString();
            const noteEl = document.getElementById(`note-${currentEditingNote.id}`);
            if (noteEl) {
                noteEl.querySelector('.sticky-note-content').textContent = text;
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
    noteEl.innerHTML = `
        <div class="drag-handle-indicator">✥</div>
        <div class="sticky-popup-inner">
            <div class="sticky-note-header">
                <span class="sticky-note-title">Note <span class="sticky-badge">Sticky</span></span>
                <div class="sticky-note-actions">
                    <button class="note-btn edit" onclick="editNote('${note.id}')">✏️</button>
                    <button class="note-btn delete" onclick="deleteNote('${note.id}')">🗑️</button>
                </div>
            </div>
            <div class="sticky-note-content">${escapeHtml(note.content)}</div>
        </div>
    `;
    makeDraggable(noteEl, note.id);
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
        const note = userNotes.find(n => n.id === noteId);
        if (note) {
            note.x = newLeft;
            note.y = newTop;
            notesChanged = true;
            triggerAutosave();
        }
    }
    function closeDragElement() {
        document.removeEventListener('mousemove', elementDrag);
        document.removeEventListener('mouseup', closeDragElement);
        document.removeEventListener('touchmove', elementDrag);
        document.removeEventListener('touchend', closeDragElement);
        element.classList.remove('dragging');
        isDragMode = false;
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

async function saveNotesToServer() {
    if (!userId) {
        console.error('Cannot save: User ID is missing');
        return;
    }
    try {
        const response = await fetch('/api/user-notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes: userNotes, userId: userId })
        });
        const result = await response.json();
        if (response.ok) {
            notesChanged = false;
        } else {
            alert('Failed to save notes: ' + (result.error || response.statusText));
        }
    } catch (error) {
    console.error('Error autosaving:', error);
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
        const highlight = userNotes.find(n => n.id === id);
        if (highlight) {
            if (highlight.note) {
                // Has note: Show as border-bottom
                el.classList.remove('highlight-no-note');
                el.classList.add('highlight-has-note');
                el.style.backgroundColor = 'transparent';
                el.style.borderBottom = `2px solid ${highlight.color}`;
            } else {
                // No note: Show as background highlight
                el.classList.add('highlight-no-note');
                el.classList.remove('highlight-has-note');
                el.style.backgroundColor = highlight.color;
                el.style.borderBottom = 'none';
            }
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
    setTimeout(function() {
        try {
            initializeNotesSystem();
            renderUserNotes();
            renderUserHighlights();
        } catch (e) {
            console.error('Error initializing user data:', e);
        }
        const testBtn = document.getElementById('addNoteBtn');
        if (testBtn) {
            testBtn.addEventListener('click', function() {});
        }
    }, 100);
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', function() {
        initializePage();
    });
} else {
    initializePage();
}
