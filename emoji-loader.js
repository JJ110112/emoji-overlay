/*
 * Emoji SVG assets are from Google Noto Emoji:
 * Copyright 2013 Google, Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0
 */

// Configuration
const EMOJI_SVG_PATH = 'emojis_svg/';
let EMOJI_BATCH_SIZE = 12;
const EMOJI_LOAD_THRESHOLD = 100; // pixels from bottom to trigger load

// Global variables
let allEmojis = [];           // All emoji paths
let emojiMetadata = {};       // Metadata for emojis
let emojiCategories = {};     // Emojis grouped by category
let filteredEmojis = [];      // Filtered emoji list based on search or category
let loadedEmojis = 0;
let isLoading = false;
let hasMoreEmojis = true;
let currentCategory = "Smileys & Emotion"; // Default category

// DOM elements
const emojiGrid = document.getElementById('emojiGrid');
const loadingIndicator = document.getElementById('loadingEmojis');
const searchInput = document.getElementById('searchEmoji');

// Initialize
document.addEventListener('DOMContentLoaded', initEmojiLoader);

// Initialize emoji loader
async function initEmojiLoader() {
    loadingIndicator.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> 載入表情符號中...';

    try {
        const manifestResponse = await fetch('emoji-manifest.json');
        if (!manifestResponse.ok) throw new Error('manifest fetch failed');
        const rawManifest = await manifestResponse.json();
        allEmojis = rawManifest.filter(path => {
            const match = path.match(/emoji_u([0-9a-f_]+)\.svg$/i);
            if (!match) return false;
            const codepoints = match[1].split('_');
            return codepoints.length === 1; // ✅ 只保留單一碼 emoji
        });

        mapEmojiFilesToCharacters(); // ✅ 確保 emojiFileMap 使用正確過濾的 allEmojis


    } catch {
        const fallback = Array.from({ length: 100 }, (_, i) => `${EMOJI_SVG_PATH}emoji_u1f6${(i + 10).toString(16)}.svg`);
        allEmojis = fallback;
    }

    try {
        const [metadataRes, categoriesRes] = await Promise.all([
            fetch('emoji-data.json'),
            fetch('emoji-categories-fixed.json') // 使用修正後的分類資料
        ]);
        emojiMetadata = await metadataRes.json();
        emojiCategories = await categoriesRes.json();
    } catch (e) {
        console.warn('metadata/categorization fetch failed', e);
        emojiCategories = [];
    }

    initCategoryTabs();
    applyCategory(currentCategory);
    initSearch();
}

// 中文與常用英文關鍵字對應表
const emojiNameMapping = {
    '笑':   ['smile', 'laugh', '1f600', '1f603', '1f604'],
    'smile': ['笑', 'laugh', '1f600', '1f603', '1f604'],
    'laugh': ['smile', '笑', '1f600', '1f603', '1f604'],

    '哭':   ['cry', 'sad', '1f622', '1f62d'],
    'cry':  ['哭', 'sad', '1f622', '1f62d'],
    'sad':  ['cry', '哭', '1f622', '1f62d'],

    '愛':   ['love', 'heart', '2764'],
    'love': ['愛', 'heart', '2764'],
    'heart': ['love', '愛', '2764'],

    '心':   ['heart', '愛', '2764'],

    '星':   ['star', '2b50'],
    'star': ['星', '2b50'],

    '貓':   ['cat', '1f63a'],
    'cat':  ['貓', '1f63a'],

    '狗':   ['dog', '1f436'],
    'dog':  ['狗', '1f436'],

    '食':   ['food', '1f354'],
    'food': ['食', '1f354'],

    '花':   ['flower', '1f337'],
    'flower': ['花', '1f337'],

    '臉':   ['face', '1f60', '1f61', '1f62', '1f63'],
    'face': ['臉', '1f60', '1f61', '1f62', '1f63'],

    'happy': ['smile', '笑', 'laugh', '1f600', '1f603', '1f604'],
    // 可依需求擴充
};

function initSearch() {
    searchInput.addEventListener('input', () => {
        const term = searchInput.value.trim().toLowerCase();
        if (!term) {
            applyCategory(currentCategory);
            resetEmojiLoad();
            return;
        }
        // 若 mapping 有對應，直接用 mapping 關鍵字；否則用原本 term
        let searchTerms = emojiNameMapping[term] ? emojiNameMapping[term] : [term];
        filteredEmojis = allEmojis.filter(emojiPath => {
            const char = emojiFileMap[emojiPath];
            if (!char) return false;
            const meta = emojiMetadata[char];
            if (!meta) return false;
            const name = meta.name?.toLowerCase() || '';
            const slug = meta.slug?.toLowerCase() || '';
            // 比對所有關鍵字
            return searchTerms.some(keyword =>
                name.includes(keyword) ||
                slug.includes(keyword) ||
                emojiPath.toLowerCase().includes(keyword)
            );
        });
        console.log(`Filtered ${filteredEmojis.length} emojis for search: ${term}`);
        resetEmojiLoad();
    });
}

function applyCategory(category) {
    currentCategory = category;
    const match = emojiCategories.find(c => c.name === category || c.slug === category);
    if (!match) {
        console.warn(`Category ${category} not found`);
        filteredEmojis = match.emojis
            .map(e => {
                if (!e.slug) return null;
                const codepoints = e.slug
                    .split('_')
                    .filter(cp => !['fe0f', '200d', '1f3fb', '1f3fc', '1f3fd', '1f3fe', '1f3ff'].includes(cp));
                if (codepoints.length !== 1) return null; // 只保留單一碼
                const cleanedSlug = codepoints.join('_').toLowerCase();
                return `${EMOJI_SVG_PATH}emoji_u${cleanedSlug}.svg`;
            })
            .filter(Boolean);

        renderEmojis();
        return;
    }
    filteredEmojis = match.emojis
        .map(e => {
            if (!e.slug) return null;
            const codepoints = e.slug
                .split('_')
                .filter(cp => !['fe0f', '200d', '1f3fb', '1f3fc', '1f3fd', '1f3fe', '1f3ff'].includes(cp));
            if (codepoints.length !== 1) return null; // 只保留單一碼
            const cleanedSlug = codepoints.join('_').toLowerCase();
            return `${EMOJI_SVG_PATH}emoji_u${cleanedSlug}.svg`;
        })
        .filter(Boolean);

      
    renderEmojis();
}

// Map emoji SVG filenames to Unicode characters for metadata lookup
function mapEmojiFilesToCharacters() {
    emojiFileMap = {};
    
    // Example mapping: emoji_u1f600.svg -> 😀
    allEmojis.forEach(filePath => {
        const match = filePath.match(/emoji_u([0-9a-f_]+)\.svg$/i);
        if (match) {
            let hexCode = match[1].replace(/_/g, ' ');
            let codePoints = hexCode.split(' ').map(point => parseInt(point, 16));
            let char = String.fromCodePoint(...codePoints);
            emojiFileMap[filePath] = char;
        }
    });
}

function isSimpleEmojiPath(path) {
    const match = path.match(/emoji_u([0-9a-f_]+)\.svg$/i);
    if (!match) return false;
    const codepoints = match[1].split('_');
    return codepoints.length === 1;
}


// Initialize category tabs
function initCategoryTabs() {
    const tabContainer = document.querySelector('.category-tabs');
    const tabButtons = tabContainer.querySelectorAll('.category-tab');
    tabButtons.forEach(tab => {
        tab.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tab.classList.add('active');
            const category = tab.dataset.category;

            // 強制重設 loading 狀態
            isLoading = false;
            loadingIndicator.innerHTML = '';
            loadingIndicator.style.display = 'none';

            if (category === 'all') {
                filteredEmojis = allEmojis.filter(path => {
                    const match = path.match(/emoji_u([0-9a-f_]+)\.svg$/i);
                    if (!match) return false;
                    const codepoints = match[1].split('_');
                    return codepoints.length === 1;
                });
            } else {
                applyCategory(category);
            }

            resetEmojiLoad();
        });
    });
    console.log('Category tabs initialized:', [...tabButtons].map(t => t.dataset.category));
}

function resetEmojiLoad() {
    loadedEmojis = 0;
    hasMoreEmojis = true;
    isLoading = false;
    emojiGrid.innerHTML = '';
    renderEmojis();
}

function renderEmojis() {
    if (isLoading || !hasMoreEmojis) return;
    isLoading = true;

    const batch = filteredEmojis.slice(loadedEmojis, loadedEmojis + EMOJI_BATCH_SIZE);
    batch.forEach(src => {
        const div = document.createElement('div');
        div.className = 'emoji-item';
        div.setAttribute('draggable', 'true');
        // Always use relative path for consistency
        const fullPath = src.startsWith('http') ? src : `${EMOJI_SVG_PATH}${src.split('/').pop()}`;
        div.dataset.path = fullPath;
        div.dataset.emojiSrc = fullPath;

        const img = document.createElement('img');
        img.src = fullPath;
        img.alt = 'emoji';
        img.style.width = '64px';
        img.style.height = '64px';
        img.onerror = () => {
            console.warn(`Failed to load emoji: ${fullPath}`);
            div.remove();
        };

        // Attach click event for adding to canvas
        img.addEventListener('click', () => {
            if (window.addEmojiToCanvas) window.addEmojiToCanvas(fullPath);
        });

        // Attach dragstart event
        if (window.handleEmojiDragStart) {
            div.addEventListener('dragstart', window.handleEmojiDragStart);
            img.addEventListener('dragstart', window.handleEmojiDragStart);
        }

        div.appendChild(img);
        emojiGrid.appendChild(div);
    });

    loadedEmojis += batch.length;
    if (loadedEmojis >= filteredEmojis.length) {
        hasMoreEmojis = false;
    }
    isLoading = false;
    updateLoadingIndicator();
}

// Handle sidebar scroll
function handleSidebarScroll(event) {
    if (isLoading || !hasMoreEmojis) return;
    
    const sidebar = event.target;
    const scrollBottom = sidebar.scrollTop + sidebar.clientHeight;
    const threshold = sidebar.scrollHeight - EMOJI_LOAD_THRESHOLD;
    
    if (scrollBottom >= threshold) {
        loadMoreEmojis();
    }
}

// Update loading indicator
function updateLoadingIndicator() {
    if (!hasMoreEmojis) {
        loadingIndicator.style.display = 'none';
    } else if (isLoading) {
        loadingIndicator.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> 載入更多表情符號...';
        loadingIndicator.style.display = 'block';
    } else {
        loadingIndicator.innerHTML = '<button class="load-more-btn"><i class="fas fa-plus-circle"></i> 載入更多表情符號</button>';
        loadingIndicator.style.display = 'block';
        // 綁定點擊事件
        const loadMoreBtn = loadingIndicator.querySelector('.load-more-btn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', loadMoreEmojis);
        }
    }
}

// Load more emojis
async function loadMoreEmojis() {
    if (isLoading || !hasMoreEmojis) return;

    isLoading = true;
    updateLoadingIndicator();

    try {
        const endIndex = loadedEmojis + EMOJI_BATCH_SIZE;
        const emojisToLoad = filteredEmojis.slice(loadedEmojis, endIndex);

        if (emojisToLoad.length === 0) {
            hasMoreEmojis = false;
            updateLoadingIndicator();
            isLoading = false;
            return;
        }

        // Add emojis to the grid
        for (const emojiPath of emojisToLoad) {
            await addEmojiToGrid(emojiPath);
        }

        if (loadedEmojis >= filteredEmojis.length) {
            hasMoreEmojis = false;
        }

        console.log(`Loaded ${loadedEmojis}/${filteredEmojis.length} emojis (${Math.min(100, Math.round((loadedEmojis / filteredEmojis.length) * 100))}%)`);
    } catch (error) {
        console.error('Error loading more emojis:', error);
        loadingIndicator.textContent = '載入失敗。請重新整理頁面或稍後再試。';
    } finally {
        isLoading = false;
        updateLoadingIndicator();
    }
}

// Add emoji to grid
async function addEmojiToGrid(emojiPath) {
    const emojiItem = document.createElement('div');
    emojiItem.className = 'emoji-item';
    emojiItem.setAttribute('draggable', 'true');

    // Always use relative path for consistency
    const fullPath = emojiPath.startsWith('http') ? emojiPath : `${EMOJI_SVG_PATH}${emojiPath.split('/').pop()}`;
    emojiItem.dataset.path = fullPath;
    emojiItem.dataset.emojiSrc = fullPath;

    const img = document.createElement('img');
    img.src = fullPath;
    img.alt = 'emoji';
    img.style.width = '64px';
    img.style.height = '64px';
    img.onerror = () => {
        console.warn(`Failed to load emoji: ${fullPath}`);
        emojiItem.remove();
    };

    // Attach click event
    img.addEventListener('click', () => {
        if (window.addEmojiToCanvas) window.addEmojiToCanvas(fullPath);
    });

    // Attach dragstart event
    if (window.handleEmojiDragStart) {
        emojiItem.addEventListener('dragstart', (e) => {
            emojiItem.classList.add('dragging');
            window.handleEmojiDragStart(e);
        });
        img.addEventListener('dragstart', (e) => {
            emojiItem.classList.add('dragging');
            window.handleEmojiDragStart(e);
        });
    }

    emojiItem.appendChild(img);
    emojiGrid.appendChild(emojiItem);
    loadedEmojis++;
}

// Select an emoji
function selectEmoji(emojiPath, svgContent) {
    // This function will be implemented in editor.js
    if (window.addEmojiToCanvas) {
        window.addEmojiToCanvas(emojiPath, svgContent);
    } else {
        console.error('Editor functionality not loaded');
    }
}

// Additional functions for category and search
function filterEmojisByCategory(category) {
    currentCategory = category;
    
    const categoryEntry = emojiCategories.find(c => c.name === category || c.slug === category);

if (!categoryEntry) {
  console.warn(`Category ${category} not found`);
  return;
}

    filteredEmojis = categoryEntry.emojis
        .map(e => {
            if (!e.slug) return null;
            const codepoints = e.slug
                .split('_')
                .filter(cp => !['fe0f', '200d', '1f3fb', '1f3fc', '1f3fd', '1f3fe', '1f3ff'].includes(cp));
            if (codepoints.length !== 1) return null; // 只保留單一碼
            const cleanedSlug = codepoints.join('_').toLowerCase();
            return `${EMOJI_SVG_PATH}emoji_u${cleanedSlug}.svg`;
        })
        .filter(Boolean);


    
    
    // Get emojis for this category
    const categoryEmojis = emojiCategories[category];
    
    // Log category info for debugging
    console.log(`Category ${category} has ${categoryEmojis.length} emojis`);
    
    // Log the filtered results
    console.log(`Filtered to ${filteredEmojis.length} matching emojis for category ${category}`);
}

// Reset and reload emojis
function resetAndLoadEmojis() {
    // Clear grid
    emojiGrid.innerHTML = '';
    
    // Reset counters
    loadedEmojis = 0;
    hasMoreEmojis = filteredEmojis.length > 0;
    
    // Load first batch
    loadMoreEmojis();
}

// Handle search input with improved matching
function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (!searchTerm) {
        if (currentCategory === 'all') {
            filteredEmojis = allEmojis.filter(path => {
                const match = path.match(/emoji_u([0-9a-f_]+)\.svg$/i);
                if (!match) return false;
                const codepoints = match[1].split('_');
                return codepoints.length === 1;
            });
        } else {
            filterEmojisByCategory(currentCategory);
        }
        resetAndLoadEmojis();
        return;
    }

    
    // Get mapped terms for the search
    const searchTerms = [searchTerm];
    
    // Add mapped terms if they exist
    Object.keys(emojiNameMapping).forEach(key => {
        if (key.includes(searchTerm) || searchTerm.includes(key)) {
            searchTerms.push(...emojiNameMapping[key]);
        }
    });
    
    // Check if we have metadata available for better searching
    if (Object.keys(emojiMetadata).length > 0) {
        // Use emoji metadata for more accurate searching
        filteredEmojis = allEmojis.filter(emojiPath => {
            const char = emojiFileMap[emojiPath];
            if (!char) return false;

            const metadata = emojiMetadata[char];
            if (!metadata) return false;

            const slugParts = (metadata.slug || '').split('_');
            if (slugParts.length > 1) return false; // ✅ 過濾複合 emoji

            const name = metadata.name?.toLowerCase() || '';
            const slug = metadata.slug?.toLowerCase() || '';

            return searchTerms.some(term =>
                name.includes(term) ||
                slug.includes(term) ||
                emojiPath.toLowerCase().includes(term)
            );
        });

    } else {
        // Fallback to basic path matching
        filteredEmojis = allEmojis.filter(emojiPath => {
            return searchTerms.some(term => emojiPath.toLowerCase().includes(term));
        });
    }
    
    // Reset category tabs
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector('.category-tab[data-category="all"]').classList.add('active');
    
    // Reset and reload with filtered results
    resetAndLoadEmojis();
    
    // Log the search for debugging
    console.log('Searching for:', searchTerms, 'Found:', filteredEmojis.length, 'results');
}

// Generate a manifest file with the list of emojis
// Note: This is just a placeholder. In a real implementation,
// this would be generated on the server or during build
async function generateEmojiManifest() {
    // This function would normally run on the server or during build
    // For this implementation, we'll manually create the emoji-manifest.json file
    console.log('Emoji manifest should be manually created');
}

window.addEventListener('scroll', () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - EMOJI_LOAD_THRESHOLD) {
        renderEmojis();
    }
});
