let uploadedImage = null;
let activeEmoji = null;
let activeEmojiSvg = null;
let isDragging = false;
let isResizing = false;
let currentResizeHandle = null;
let lastMousePos = { x: 0, y: 0 };
let emojiPosition = { x: 0, y: 0, width: 100, height: 100 };
let emojis = []; // Array to store multiple emojis
let selectedEmojiIndex = -1; // Index of selected emoji (-1 means none selected)
let ctrlKeyPressed = false;

// Global variable to track currently dragged emoji
let currentlyDraggedEmojiSrc = null;

// DOM elements
const uploadBtn = document.getElementById('uploadBtn');
const imageUpload = document.getElementById('imageUpload');
const downloadBtn = document.getElementById('downloadBtn');
const removeEmojiBtn = document.getElementById('removeEmojiBtn');
const uploadPrompt = document.getElementById('uploadPrompt');
const mainCanvas = document.getElementById('mainCanvas');
const canvasContainer = document.querySelector('.canvas-container');
const emojiEditor = document.getElementById('emojiEditor');
const resizeHandles = document.querySelectorAll('.resize-handle');


// Canvas context
const ctx = mainCanvas.getContext('2d');

// Initialize
document.addEventListener('DOMContentLoaded', initEditor);


// Update initEditor to add CSS to prevent text selection and emojiEditor interference
function initEditor() {
    uploadBtn.addEventListener('click', triggerImageUpload);
    imageUpload.addEventListener('change', handleImageUpload);
    downloadBtn.addEventListener('click', downloadCompositeImage);
    removeEmojiBtn.addEventListener('click', function () {
        emojis = [];
        selectedEmojiIndex = -1;
        emojiEditor.classList.add('hidden');
        drawCanvas();
        removeEmojiBtn.disabled = true;
    });
    canvasContainer.addEventListener('dragover', handleDragOver);
    canvasContainer.addEventListener('drop', handleDrop);

    // Add click event to canvas for selecting emojis
    mainCanvas.addEventListener('mousedown', startSelectEmoji);
    emojiEditor.removeEventListener('mousedown', startDragEmoji);
    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', stopHandler);

    resizeHandles.forEach(handle => {
        handle.addEventListener('mousedown', startResizeEmoji);
    });

    // Prevent text selection and ensure emojiEditor doesn't block events
    mainCanvas.style.userSelect = 'none';
    canvasContainer.style.userSelect = 'none';
    emojiEditor.style.userSelect = 'none';
    emojiEditor.style.pointerEvents = 'none'; // Allow events to pass through
    resizeHandles.forEach(handle => {
        handle.style.pointerEvents = 'auto'; // Enable resize handles
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Control') {
            ctrlKeyPressed = true;
            if (selectedEmojiIndex >= 0) {
                mainCanvas.style.cursor = 'copy';
            }
        }
        if (event.key === 'Delete' && selectedEmojiIndex >= 0 && selectedEmojiIndex < emojis.length) {
            removeEmoji();
            setTimeout(() => {
                drawCanvas();
            }, 10);
        }
    });

    document.addEventListener('keyup', function (event) {
        if (event.key === 'Control') {
            ctrlKeyPressed = false;
            mainCanvas.style.cursor = 'default';
        }
    });

    document.querySelectorAll('.emoji-item').forEach(item => {
        item.addEventListener('dragstart', handleEmojiDragStart);
        const img = item.querySelector('img');
        if (img) {
            img.addEventListener('dragstart', handleEmojiDragStart);
        }
    });

    const emojiGrid = document.getElementById('emojiGrid');
    const observer = new MutationObserver(() => {
        document.querySelectorAll('.emoji-item').forEach(item => {
            item.setAttribute('draggable', 'true');
            item.addEventListener('dragstart', handleEmojiDragStart);
            const img = item.querySelector('img');
            if (img) {
                img.setAttribute('draggable', 'true');
                img.addEventListener('dragstart', handleEmojiDragStart);
            }
        });
    });
    observer.observe(emojiGrid, {
        childList: true,
        subtree: true
    });

    window.addEmojiToCanvas = addEmojiToCanvas;
    window.handleEmojiDragStart = handleEmojiDragStart;
}

// Handle dragstart for emoji items
function handleEmojiDragStart(event) {
    console.log('[DragStart] handleEmojiDragStart called', event.target);
    const emojiItem = event.target.closest('.emoji-item');
    if (!emojiItem) {
        console.log('[DragStart] No emoji item found in parents');
        return;
    }

    emojiItem.classList.add('dragging');
    const handleDragEnd = () => {
        emojiItem.classList.remove('dragging');
        event.target.removeEventListener('dragend', handleDragEnd);
    };
    event.target.addEventListener('dragend', handleDragEnd);

    let emojiSrc = emojiItem.dataset.emojiSrc || emojiItem.dataset.path;
    if (!emojiSrc) {
        console.log('[DragStart] No emoji source found for:', emojiItem);
        return;
    }

    // Always use the relative path for drag-and-drop
    currentlyDraggedEmojiSrc = emojiSrc;
    console.log('[DragStart] currentlyDraggedEmojiSrc set to:', emojiSrc);

    event.dataTransfer.setData('text/plain', emojiSrc);
    event.dataTransfer.setData('text/uri-list', emojiSrc);
    event.dataTransfer.setData('application/x-emoji', emojiSrc);
    event.dataTransfer.effectAllowed = 'copy';

    const dragIcon = new Image();
    dragIcon.src = emojiSrc;
    dragIcon.width = 40;
    dragIcon.height = 40;
    document.body.appendChild(dragIcon);
    event.dataTransfer.setDragImage(dragIcon, 20, 20);
    setTimeout(() => document.body.removeChild(dragIcon), 0);
}


// Modified handleDragOver to allow emoji drops
function handleDragOver(event) {
    event.preventDefault(); // ⭐ 必須有，否則 drop 不會觸發
    event.dataTransfer.dropEffect = 'copy'; // ⭐ 這樣滑鼠才不會顯示 🚫
    
    // Ensure the canvas container accepts drops from anywhere
    if (event.target.closest('.canvas-container')) {
        event.stopPropagation();
    }
}


// Modified handleDrop to support both image and emoji drops
function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    
    // Log all types and their values for debugging
    console.log('Drop event types:', event.dataTransfer.types);
    for (const type of event.dataTransfer.types) {
        try {
            console.log(`[Drop] getData ${type}:`, event.dataTransfer.getData(type));
        } catch (e) {
            console.log(`[Drop] getData ${type}: ERROR`, e);
        }
    }
    
    console.log('[Drop] currentlyDraggedEmojiSrc before use:', currentlyDraggedEmojiSrc);
    let emojiSrc = currentlyDraggedEmojiSrc;
    currentlyDraggedEmojiSrc = null; // Reset after drop

    // If we don't have the emoji from the global variable, try to get it from dataTransfer
    if (!emojiSrc) {
        // Try all possible data formats
        const xEmoji = event.dataTransfer.getData('application/x-emoji');
        const plain = event.dataTransfer.getData('text/plain');
        const uriList = event.dataTransfer.getData('text/uri-list');

        console.log('[Drop] application/x-emoji:', xEmoji);
        console.log('[Drop] plain:', plain);
        console.log('[Drop] uriList:', uriList);

        // Check each potential source with more flexible matching
        if (xEmoji && xEmoji.includes('emoji_u')) {
            emojiSrc = xEmoji;
        } else if (plain && plain.includes('emoji_u')) {
            emojiSrc = plain;
        } else if (uriList && uriList.includes('emoji_u')) {
            emojiSrc = uriList;
        } else if (plain && plain.includes('emojis_svg')) {
            emojiSrc = plain;
        } else if (uriList && uriList.includes('emojis_svg')) {
            emojiSrc = uriList;
        }
        
        // Do nothing! Always use the relative path as-is.
    }

    if (emojiSrc) {
        console.log('[Drop] Using emojiSrc:', emojiSrc);
        if (!uploadedImage) {
            alert("請先上傳圖片再加入表情符號");
            return;
        }
        const canvasRect = mainCanvas.getBoundingClientRect();
        const x = event.clientX - canvasRect.left;
        const y = event.clientY - canvasRect.top;
        addEmojiAtPosition(emojiSrc, x, y);
    } else if (event.dataTransfer.files.length > 0 && event.dataTransfer.files[0].type.startsWith('image/')) {
        // Handle image drop
        const file = event.dataTransfer.files[0];
        const reader = new FileReader();
        reader.onload = function (e) {
            loadImage(e.target.result);
        };
        reader.readAsDataURL(file);
    } else {
        console.log('[Drop] Could not determine what was dropped');
    }
}

// Add emoji at specific position
function addEmojiAtPosition(emojiSrc, x, y) {
    const emojiImg = new Image();
    emojiImg.onload = function () {
        const emojiWidth = 80;
        const emojiHeight = 80;
        x = Math.max(0, Math.min(x - emojiWidth / 2, mainCanvas.width - emojiWidth));
        y = Math.max(0, Math.min(y - emojiHeight / 2, mainCanvas.height - emojiHeight));
        const emojiObj = {
            img: emojiImg,
            x: x,
            y: y,
            width: emojiWidth,
            height: emojiHeight
        };
        emojis.push(emojiObj);
        selectedEmojiIndex = emojis.length - 1;
        drawCanvas();
        updateEmojiEditor(emojiObj);
    };
    emojiImg.src = emojiSrc;
}


// Trigger image upload dialog
function triggerImageUpload() {
    imageUpload.click();
}

// Handle image upload
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function (e) {
            loadImage(e.target.result);
        };
        reader.readAsDataURL(file);
    }
}

// Load image to canvas
function loadImage(src) {
    uploadedImage = new Image();
    uploadedImage.onload = function () {
        uploadPrompt.style.display = 'none';
        mainCanvas.style.display = 'block';
        resizeCanvasToFitImage(uploadedImage);

        // Clear all emojis
        emojis = [];
        selectedEmojiIndex = -1;

        // Hide emoji editor
        emojiEditor.classList.add('hidden');

        drawCanvas();
        downloadBtn.disabled = false;
    };
    uploadedImage.src = src;
}

// Resize canvas to fit image
function resizeCanvasToFitImage(image) {
    const containerWidth = canvasContainer.clientWidth - 40;
    const containerHeight = canvasContainer.clientHeight - 40;
    const imageRatio = image.width / image.height;
    const containerRatio = containerWidth / containerHeight;
    let canvasWidth, canvasHeight;
    if (imageRatio > containerRatio) {
        canvasWidth = containerWidth;
        canvasHeight = canvasWidth / imageRatio;
    } else {
        canvasHeight = containerHeight;
        canvasWidth = canvasHeight * imageRatio;
    }
    mainCanvas.width = canvasWidth;
    mainCanvas.height = canvasHeight;
}

// Draw canvas with image and all emojis
function drawCanvas() {
    // Clear the entire canvas
    ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);

    // Draw the background image if it exists
    if (uploadedImage) {
        ctx.drawImage(uploadedImage, 0, 0, mainCanvas.width, mainCanvas.height);
    }

    // Draw each emoji in the emojis array
    emojis.forEach((emoji, index) => {
        if (emoji && emoji.img) {
            ctx.drawImage(emoji.img, emoji.x, emoji.y, emoji.width, emoji.height);
            // Highlight selected emoji
            if (index === selectedEmojiIndex) {
                ctx.strokeStyle = '#3498db';
                ctx.lineWidth = 2;
                ctx.strokeRect(emoji.x - 2, emoji.y - 2, emoji.width + 4, emoji.height + 4);
            }
        }
    });

    // Update the emoji editor UI
    if (selectedEmojiIndex >= 0 && emojis[selectedEmojiIndex]) {
        updateEmojiEditor(emojis[selectedEmojiIndex]);
        removeEmojiBtn.disabled = false;
    } else {
        updateEmojiEditor(null);
        removeEmojiBtn.disabled = true;
    }

    mainCanvas.style.display = 'block';
}

// Draw a single emoji on canvas (unused in current implementation but kept for compatibility)
function drawSingleEmoji(emoji, isSelected = false) {
    const tempImg = new Image();
    tempImg.onload = function () {
        ctx.drawImage(tempImg, emoji.position.x, emoji.position.y, emoji.position.width, emoji.position.height);
        if (isSelected) {
            ctx.strokeStyle = '#3498db';
            ctx.lineWidth = 2;
            ctx.strokeRect(emoji.position.x - 2, emoji.position.y - 2, emoji.position.width + 4, emoji.position.height + 4);
        }
    };
    const blob = new Blob([emoji.svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    tempImg.src = url;
}

// Draw emoji on canvas (compatibility function)
function drawEmojiOnCanvas() {
    if (selectedEmojiIndex >= 0 && selectedEmojiIndex < emojis.length) {
        drawSingleEmoji(emojis[selectedEmojiIndex], true);
    }
}

// Add emoji to canvas
function addEmojiToCanvas(emojiSrc) {
    if (!uploadedImage) {
        alert("請先上傳圖片再加入表情符號");
        return;
    }
    const emojiImg = new Image();
    emojiImg.onload = function () {
        // Determine position for the new emoji
        let newX = 50; // Default starting x
        let newY = 50; // Default starting y
        if (emojis.length > 0) {
            // Use the last emoji's position and offset by (10, 10)
            const lastEmoji = emojis[emojis.length - 1];
            newX = lastEmoji.x + 10;
            newY = lastEmoji.y + 10;
            // Ensure the new emoji stays within canvas bounds
            newX = Math.min(newX, mainCanvas.width - 80); // 80 is emoji width
            newY = Math.min(newY, mainCanvas.height - 80); // 80 is emoji height
        }
        const emojiObj = {
            img: emojiImg,
            x: newX,
            y: newY,
            width: 80,
            height: 80
        };
        emojis.push(emojiObj);
        selectedEmojiIndex = emojis.length - 1;
        drawCanvas();
        updateEmojiEditor(emojiObj);
    };
    emojiImg.src = emojiSrc;
}

// Update emoji editor position and size
function updateEmojiEditor(emoji) {
    if (!emoji || selectedEmojiIndex < 0) {
        emojiEditor.classList.add('hidden');
        return;
    }
    const canvasRect = mainCanvas.getBoundingClientRect();
    emojiEditor.style.left = `${canvasRect.left + emoji.x}px`;
    emojiEditor.style.top = `${canvasRect.top + emoji.y}px`;
    emojiEditor.style.width = `${emoji.width}px`;
    emojiEditor.style.height = `${emoji.height}px`;
    emojiEditor.classList.remove('hidden');
}

// Modified canvas mousedown handler to start dragging immediately
// Modified canvas mousedown handler with drag threshold
function startSelectEmoji(event) {
    if (event.target.classList.contains('resize-handle')) return;

    const canvasRect = mainCanvas.getBoundingClientRect();
    const x = event.clientX - canvasRect.left;
    const y = event.clientY - canvasRect.top;

    // Select emoji under the mouse
    if (selectEmojiOnCanvas(x, y)) {
        if (ctrlKeyPressed) {
            const originalEmoji = emojis[selectedEmojiIndex];
            const duplicatedEmoji = {
                img: originalEmoji.img,
                x: originalEmoji.x + 20,
                y: originalEmoji.y + 20,
                width: originalEmoji.width,
                height: originalEmoji.height
            };
            emojis.push(duplicatedEmoji);
            selectedEmojiIndex = emojis.length - 1;
            drawCanvas();
            updateEmojiEditor(duplicatedEmoji);
        }

        // Add drag threshold
        lastMousePos = { x: event.clientX, y: event.clientY };
        const startDrag = (moveEvent) => {
            const dx = moveEvent.clientX - lastMousePos.x;
            const dy = moveEvent.clientY - lastMousePos.y;
            if (Math.sqrt(dx * dx + dy * dy) > 5) { // 5-pixel threshold
                isDragging = true;
                document.removeEventListener('mousemove', startDrag);
                dragEmoji(moveEvent);
            }
        };
        document.addEventListener('mousemove', startDrag);
        document.addEventListener('mouseup', () => {
            document.removeEventListener('mousemove', startDrag);
        }, { once: true });

        event.preventDefault();
        event.stopPropagation();
        console.log('Potential drag started for emoji', selectedEmojiIndex);
    } else {
        selectedEmojiIndex = -1;
        updateEmojiEditor(null);
        drawCanvas();
    }
}

// Remove or modify the emojiEditor mousedown handler
// Option 1: Remove it entirely if dragging is handled via canvas
emojiEditor.removeEventListener('mousedown', startDragEmoji);
// Optionally, keep a simplified version for specific interactions
function startDragEmoji(event) {
    if (event.target.classList.contains('resize-handle')) return;
    // Delegate to canvas handler or do nothing, as canvas handles dragging
}

// Combined move handler for both dragging and resizing
function moveHandler(event) {
    if (isDragging) {
        dragEmoji(event);
    } else if (isResizing) {
        resizeEmoji(event);
    }
}

// Modified stop handler to ensure clean drag termination
function stopHandler(event) {
    isDragging = false;
    isResizing = false;
    window.getSelection().removeAllRanges();
    event.preventDefault();
    event.stopPropagation();
    mainCanvas.style.cursor = 'default';
}

// Ensure dragEmoji prevents text selection and event propagation
function dragEmoji(event) {
    if (!isDragging || selectedEmojiIndex < 0) return;

    const deltaX = event.clientX - lastMousePos.x;
    const deltaY = event.clientY - lastMousePos.y;
    const emoji = emojis[selectedEmojiIndex];
    emoji.x += deltaX;
    emoji.y += deltaY;

    // Keep emoji within canvas bounds
    emoji.x = Math.max(0, Math.min(emoji.x, mainCanvas.width - emoji.width));
    emoji.y = Math.max(0, Math.min(emoji.y, mainCanvas.height - emoji.height));

    // Update cursor
    mainCanvas.style.cursor = ctrlKeyPressed ? 'copy' : 'move';

    lastMousePos = { x: event.clientX, y: event.clientY };
    window.getSelection().removeAllRanges();
    event.preventDefault();
    event.stopPropagation();

    drawCanvas();
    updateEmojiEditor(emoji);
    console.log('Dragging emoji', selectedEmojiIndex, 'to', emoji.x, emoji.y);
}

// Start resizing emoji
function startResizeEmoji(event) {
    isResizing = true;
    isDragging = false;
    currentResizeHandle = event.target.dataset.handle;
    lastMousePos = {
        x: event.clientX,
        y: event.clientY
    };
    event.stopPropagation();
}

// Resize emoji with 1:1 aspect ratio
function resizeEmoji(event) {
    if (!isResizing || selectedEmojiIndex < 0) return;
    const deltaX = event.clientX - lastMousePos.x;
    const deltaY = event.clientY - lastMousePos.y;
    let delta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
    const emoji = emojis[selectedEmojiIndex];
    switch (currentResizeHandle) {
        case 'br':
            emoji.width += delta;
            emoji.height += delta;
            break;
    }
    const minSize = 30;
    if (emoji.width < minSize) {
        emoji.width = emoji.height = minSize;
    }
    if (emoji.height < minSize) {
        emoji.height = emoji.width = minSize;
    }
    // Ensure emoji stays within canvas bounds
    emoji.x = Math.max(0, Math.min(emoji.x, mainCanvas.width - emoji.width));
    emoji.y = Math.max(0, Math.min(emoji.y, mainCanvas.height - emoji.height));
    lastMousePos = { x: event.clientX, y: event.clientY };
    drawCanvas();
    updateEmojiEditor(emoji);
}

// Remove emoji
function removeEmoji() {
    if (selectedEmojiIndex >= 0 && selectedEmojiIndex < emojis.length) {
        emojis.splice(selectedEmojiIndex, 1);
        selectedEmojiIndex = -1;
        emojiEditor.classList.add('hidden');
        drawCanvas();
    }
}

// Select emoji by clicking on it
function selectEmojiOnCanvas(x, y) {
    let found = false;
    for (let i = emojis.length - 1; i >= 0; i--) {
        const emoji = emojis[i];
        if (
            x >= emoji.x && x <= emoji.x + emoji.width &&
            y >= emoji.y && y <= emoji.y + emoji.height
        ) {
            selectedEmojiIndex = i;
            drawCanvas();
            updateEmojiEditor(emoji);
            found = true;
            break;
        }
    }
    if (!found) {
        selectedEmojiIndex = -1;
        updateEmojiEditor(null);
    }
    return found;
}

// Example: Function to populate emoji grid (replace with your actual code)
function populateEmojiGrid(emojis) {
    const emojiGrid = document.querySelector('.emoji-grid');
    emojiGrid.innerHTML = ''; // Clear existing emojis
    emojis.forEach(emoji => {
        const emojiItem = document.createElement('div');
        emojiItem.className = 'emoji-item';
        emojiItem.setAttribute('draggable', 'true');
        emojiItem.dataset.emojiSrc = emoji.url; // URL to the emoji image/SVG
        const img = document.createElement('img');
        img.src = emoji.url;
        img.alt = 'Emoji';
        emojiItem.appendChild(img);
        emojiGrid.appendChild(emojiItem);
        emojiItem.addEventListener('dragstart', handleEmojiDragStart);
        img.addEventListener('dragstart', handleEmojiDragStart);
    });
}

// Download composite image
function downloadCompositeImage() {
    if (!uploadedImage) return;
    const link = document.createElement('a');
    link.download = 'emoji-composition.png';
    link.href = mainCanvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}