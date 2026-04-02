/**
 * ASSET LOADER FOR GITHUB PAGES
 * 
 * This script automatically scans an 'assets' folder on GitHub Pages and loads
 * all media files into your portfolio. No need to manually list each file!
 * 
 * HOW TO USE:
 * 1. Place this script in your HTML (before closing </body>)
 * 2. Create an 'assets' folder in your GitHub repository
 * 3. Organize files like this:
 *    assets/
 *      photography/
 *        photo1.jpg
 *        photo2.png
 *      cinematography/
 *        video1.mp4
 *        video2.mov
 *      graphic-design/
 *        design1.png
 *        design2.jpg
 *      web-dev/
 *        website1.png
 *        website2.jpg
 * 4. Your portfolio will automatically show all files!
 * 
 * SUPPORTED FORMATS:
 * - Images: jpg, jpeg, png, gif, webp, svg, bmp, tiff, ico
 * - Videos: mp4, webm, ogg, mov, avi, mkv, flv, wmv, m4v, 3gp
 */

(function() {
    'use strict';

    // ==================== CONFIGURATION ====================
    // Change these paths to match your GitHub repository structure
    const ASSETS_BASE_PATH = 'assets/';  // Root assets folder
    
    // Map sections to their asset subfolders
    const SECTION_FOLDERS = {
        photography:    'photography/',
        cinematography: 'cinematography/',
        graphicdesign:  'graphic-design/',
        webdev:         'web-dev/'
    };
    
    // File extensions to look for (case insensitive)
    const SUPPORTED_IMAGES = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'ico'];
    const SUPPORTED_VIDEOS = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'flv', 'wmv', 'm4v', '3gp'];
    
    // ==================== GLOBAL STORAGE ====================
    let assetCache = {
        photography:    { images: [], videos: [] },
        cinematography: { images: [], videos: [] },
        graphicdesign:  { images: [], videos: [] },
        webdev:         { images: [], videos: [] }
    };
    
    let isLoading = false;
    let loadCallbacks = [];
    
    // ==================== HELPER FUNCTIONS ====================
    
    /**
     * Get file extension from filename
     */
    function getFileExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    }
    
    /**
     * Check if file is an image
     */
    function isImageFile(filename) {
        const ext = getFileExtension(filename);
        return SUPPORTED_IMAGES.includes(ext);
    }
    
    /**
     * Check if file is a video
     */
    function isVideoFile(filename) {
        const ext = getFileExtension(filename);
        return SUPPORTED_VIDEOS.includes(ext);
    }
    
    /**
     * Get section key from folder path
     */
    function getSectionFromPath(path) {
        for (const [section, folder] of Object.entries(SECTION_FOLDERS)) {
            if (path.includes(folder)) {
                return section;
            }
        }
        return null;
    }
    
    /**
     * Sort files naturally (e.g., file1, file2, file10 not file1, file10, file2)
     */
    function naturalSort(filenames) {
        return filenames.sort((a, b) => {
            return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
        });
    }
    
    /**
     * Create a file listing from directory listing HTML (GitHub Pages fallback)
     */
    function parseDirectoryListing(html, folderPath) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const links = doc.querySelectorAll('a');
        const files = [];
        
        for (const link of links) {
            const href = link.getAttribute('href');
            if (!href || href === '../' || href === '/' || href === folderPath) continue;
            
            // Remove trailing slash for folders (we don't want folders themselves)
            let fileName = href;
            if (fileName.endsWith('/')) continue;
            
            // Decode URL encoding (e.g., %20 -> space)
            fileName = decodeURIComponent(fileName);
            
            // Only include files with supported extensions
            if (isImageFile(fileName) || isVideoFile(fileName)) {
                files.push(fileName);
            }
        }
        
        return naturalSort(files);
    }
    
    /**
     * Fetch file listing from a directory (works on GitHub Pages)
     */
    async function fetchDirectoryListing(folderPath) {
        try {
            // Try to fetch the directory index
            const response = await fetch(folderPath);
            if (!response.ok) {
                console.warn(`Cannot access ${folderPath} - HTTP ${response.status}`);
                return [];
            }
            
            const html = await response.text();
            const files = parseDirectoryListing(html, folderPath);
            
            console.log(`📁 Found ${files.length} assets in ${folderPath}:`, files);
            return files;
        } catch (error) {
            console.error(`Error fetching ${folderPath}:`, error);
            return [];
        }
    }
    
    /**
     * Load all assets from all section folders
     */
    async function loadAllAssets(onProgress, onComplete) {
        if (isLoading) {
            // Wait for existing load to complete
            loadCallbacks.push({ onProgress, onComplete });
            return;
        }
        
        isLoading = true;
        
        // Reset cache
        for (const section of Object.keys(assetCache)) {
            assetCache[section] = { images: [], videos: [] };
        }
        
        const sections = Object.entries(SECTION_FOLDERS);
        let completed = 0;
        
        for (const [section, folder] of sections) {
            const folderPath = ASSETS_BASE_PATH + folder;
            
            try {
                const files = await fetchDirectoryListing(folderPath);
                
                for (const file of files) {
                    const filePath = folderPath + file;
                    if (isImageFile(file)) {
                        assetCache[section].images.push(filePath);
                    } else if (isVideoFile(file)) {
                        assetCache[section].videos.push(filePath);
                    }
                }
                
                // Sort each section's assets
                assetCache[section].images = naturalSort(assetCache[section].images);
                assetCache[section].videos = naturalSort(assetCache[section].videos);
                
            } catch (error) {
                console.error(`Error loading section ${section}:`, error);
            }
            
            completed++;
            if (onProgress) {
                onProgress(completed, sections.length, section);
            }
        }
        
        isLoading = false;
        
        // Log summary
        console.log('✅ Asset loading complete!');
        for (const [section, assets] of Object.entries(assetCache)) {
            console.log(`   📸 ${section}: ${assets.images.length} images, ${assets.videos.length} videos`);
        }
        
        if (onComplete) onComplete(assetCache);
        
        // Call any queued callbacks
        for (const cb of loadCallbacks) {
            if (cb.onComplete) cb.onComplete(assetCache);
        }
        loadCallbacks = [];
        
        return assetCache;
    }
    
    /**
     * Get all assets for a specific section
     */
    function getSectionAssets(section) {
        return assetCache[section] || { images: [], videos: [] };
    }
    
    /**
     * Get all assets (combined) for a section
     */
    function getAllSectionAssets(section) {
        const assets = getSectionAssets(section);
        // Combine images and videos, videos first for priority display
        return [...assets.videos, ...assets.images];
    }
    
    /**
     * Check if assets are loaded
     */
    function isAssetsLoaded() {
        return !isLoading && Object.values(assetCache).some(s => s.images.length > 0 || s.videos.length > 0);
    }
    
    /**
     * Wait for assets to load
     */
    async function waitForAssets() {
        if (isAssetsLoaded()) return assetCache;
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (isAssetsLoaded()) {
                    clearInterval(checkInterval);
                    resolve(assetCache);
                }
            }, 100);
        });
    }
    
    // ==================== UI INTEGRATION ====================
    
    /**
     * Update the photography grid with loaded assets
     */
    function updatePhotographyGrid(assets) {
        const grid = document.querySelector('.photography-grid');
        if (!grid) return;
        
        const images = assets.images;
        if (images.length === 0) {
            console.warn('No photography assets found');
            return;
        }
        
        // Get all photo items in the grid
        const photoItems = grid.querySelectorAll('.photo-item');
        
        // Update each photo item with an asset
        for (let i = 0; i < photoItems.length && i < images.length; i++) {
            const item = photoItems[i];
            const imgWrap = item.querySelector('.img-notch-inner img');
            if (imgWrap) {
                imgWrap.src = images[i];
                imgWrap.alt = `Photography ${i + 1}`;
                // Also update data-master-idx if needed
                imgWrap.setAttribute('data-master-idx', i);
                
                // Trigger blur fill update
                const inner = item.querySelector('.img-notch-inner');
                if (inner && !inner.querySelector('.blur-fill-bg')) {
                    const blurBg = document.createElement('img');
                    blurBg.className = 'blur-fill-bg';
                    blurBg.src = images[i];
                    blurBg.alt = '';
                    inner.insertBefore(blurBg, imgWrap);
                    imgWrap.classList.add('blur-fill-main');
                }
            }
        }
        
        console.log(`📸 Updated photography grid with ${Math.min(photoItems.length, images.length)} images`);
    }
    
    /**
     * Update the graphic design grid with loaded assets
     */
    function updateGraphicDesignGrid(assets) {
        const grid = document.querySelector('.graphic-design-grid');
        if (!grid) return;
        
        const images = assets.images;
        if (images.length === 0) {
            console.warn('No graphic design assets found');
            return;
        }
        
        const designItems = grid.querySelectorAll('.design-item');
        
        for (let i = 0; i < designItems.length && i < images.length; i++) {
            const item = designItems[i];
            const img = item.querySelector('.img-notch-inner img');
            if (img) {
                img.src = images[i];
                img.alt = `Design ${i + 1}`;
                img.setAttribute('data-master-idx', i + 16); // Offset for master index
                
                // Update blur fill
                const inner = item.querySelector('.img-notch-inner');
                if (inner && !inner.querySelector('.blur-fill-bg')) {
                    const blurBg = document.createElement('img');
                    blurBg.className = 'blur-fill-bg';
                    blurBg.src = images[i];
                    blurBg.alt = '';
                    inner.insertBefore(blurBg, img);
                    img.classList.add('blur-fill-main');
                }
            }
        }
        
        console.log(`🎨 Updated graphic design grid with ${Math.min(designItems.length, images.length)} images`);
    }
    
    /**
     * Update the web development grid with loaded assets
     */
    function updateWebDevGrid(assets) {
        const grid = document.querySelector('.web-showcase');
        if (!grid) return;
        
        const images = assets.images;
        if (images.length === 0) {
            console.warn('No web development assets found');
            return;
        }
        
        const webItems = grid.querySelectorAll('.web-item');
        
        for (let i = 0; i < webItems.length && i < images.length; i++) {
            const item = webItems[i];
            const img = item.querySelector('.img-notch-inner img');
            if (img) {
                img.src = images[i];
                img.alt = `Web Project ${i + 1}`;
                img.setAttribute('data-master-idx', i + 23); // Offset for master index
                
                // Update blur fill
                const inner = item.querySelector('.img-notch-inner');
                if (inner && !inner.querySelector('.blur-fill-bg')) {
                    const blurBg = document.createElement('img');
                    blurBg.className = 'blur-fill-bg';
                    blurBg.src = images[i];
                    blurBg.alt = '';
                    inner.insertBefore(blurBg, img);
                    img.classList.add('blur-fill-main');
                }
            }
        }
        
        console.log(`🌐 Updated web development grid with ${Math.min(webItems.length, images.length)} images`);
    }
    
    /**
     * Update cinematography section with loaded assets
     */
    function updateCinematographySection(assets) {
        const videoContainer = document.querySelector('.cinematography-img .cin-notch-wrap');
        if (!videoContainer) return;
        
        const videos = assets.videos;
        if (videos.length === 0) {
            console.warn('No cinematography assets found');
            return;
        }
        
        // Use first video as the main showcase
        const mainVideo = videos[0];
        const videoElements = videoContainer.querySelectorAll('video');
        
        for (const videoEl of videoElements) {
            if (videoEl.src !== mainVideo) {
                videoEl.src = mainVideo;
                videoEl.load();
                videoEl.play().catch(e => console.log('Auto-play prevented:', e));
            }
        }
        
        console.log(`🎬 Updated cinematography with video: ${mainVideo}`);
    }
    
    /**
     * Update filmstrip with all assets from all sections
     */
    function updateFilmstrip(allAssets) {
        const filmSet1 = document.getElementById('filmSet1');
        const filmSet2 = document.getElementById('filmSet2');
        const filmSet3 = document.getElementById('filmSet3');
        
        if (!filmSet1) return;
        
        // Collect all assets in order: photography, graphic design, web dev, cinematography
        const allMedia = [
            ...allAssets.photography.images,
            ...allAssets.graphicdesign.images,
            ...allAssets.webdev.images,
            ...allAssets.cinematography.videos,
            ...allAssets.cinematography.images
        ];
        
        if (allMedia.length === 0) {
            console.warn('No media found for filmstrip');
            return;
        }
        
        // Build filmstrip HTML
        function buildFilmFrames(mediaList) {
            return mediaList.map(src => {
                const isVideo = /\.(mp4|webm|ogg|mov|avi|mkv|flv|wmv|m4v|3gp)$/i.test(src);
                if (isVideo) {
                    return `<div class="film-frame">
                        <video class="blur-fill-bg" src="${src}" autoplay loop muted playsinline aria-hidden="true"></video>
                        <video class="blur-fill-main" src="${src}" autoplay loop muted playsinline></video>
                    </div>`;
                } else {
                    return `<div class="film-frame">
                        <img class="blur-fill-bg" src="${src}" alt="" aria-hidden="true">
                        <img class="blur-fill-main" src="${src}" alt="Project">
                    </div>`;
                }
            }).join('');
        }
        
        // Split into 3 sets for infinite scroll
        const setSize = Math.ceil(allMedia.length / 3);
        const set1Media = allMedia.slice(0, setSize);
        const set2Media = allMedia.slice(setSize, setSize * 2);
        const set3Media = allMedia.slice(setSize * 2);
        
        filmSet1.innerHTML = buildFilmFrames(set1Media);
        filmSet2.innerHTML = buildFilmFrames(set2Media);
        filmSet3.innerHTML = buildFilmFrames(set3Media);
        
        console.log(`🎞️ Filmstrip updated with ${allMedia.length} total media items`);
    }
    
    /**
     * Update the master projects list for modal galleries
     */
    function updateMasterProjects(allAssets) {
        // This updates the MASTER_PROJECTS array in the original script
        // Since we can't directly modify the original, we dispatch an event
        const event = new CustomEvent('assetsLoaded', { detail: allAssets });
        window.dispatchEvent(event);
        
        console.log('📦 Master projects updated');
    }
    
    // ==================== INITIALIZATION ====================
    
    /**
     * Main initialization function
     */
    async function initAssetLoader() {
        console.log('🚀 Asset Loader starting...');
        console.log('📂 Looking for assets in:', ASSETS_BASE_PATH);
        console.log('📁 Expected folder structure:');
        for (const [section, folder] of Object.entries(SECTION_FOLDERS)) {
            console.log(`   ${ASSETS_BASE_PATH}${folder} ← ${section}`);
        }
        
        // Show loading indicator
        showLoadingIndicator();
        
        // Load all assets
        const allAssets = await loadAllAssets(
            (completed, total, section) => {
                console.log(`Loading ${section}... (${completed}/${total})`);
                updateLoadingProgress(completed, total);
            },
            (assets) => {
                console.log('All assets loaded! Updating UI...');
                
                // Update all sections
                updatePhotographyGrid(assets.photography);
                updateGraphicDesignGrid(assets.graphicdesign);
                updateWebDevGrid(assets.webdev);
                updateCinematographySection(assets.cinematography);
                updateFilmstrip(assets);
                updateMasterProjects(assets);
                
                // Hide loading indicator
                hideLoadingIndicator();
                
                // Dispatch event that assets are ready
                const readyEvent = new CustomEvent('assetsReady', { detail: assets });
                window.dispatchEvent(readyEvent);
            }
        );
        
        return allAssets;
    }
    
    /**
     * Show loading indicator on the page
     */
    function showLoadingIndicator() {
        let indicator = document.getElementById('asset-loader-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'asset-loader-indicator';
            indicator.innerHTML = `
                <div style="position:fixed; bottom:20px; left:20px; z-index:10000; background:rgba(0,0,0,0.8); backdrop-filter:blur(10px); padding:12px 24px; border-radius:50px; color:white; font-size:14px; font-family:monospace; border-left:3px solid #ff5733; pointer-events:none;">
                    <span id="loader-text">📁 Loading assets...</span>
                    <span id="loader-progress" style="margin-left:10px; color:#ff8c33;"></span>
                </div>
            `;
            document.body.appendChild(indicator);
        }
        indicator.style.display = 'block';
    }
    
    /**
     * Update loading progress
     */
    function updateLoadingProgress(current, total) {
        const progressSpan = document.getElementById('loader-progress');
        if (progressSpan) {
            progressSpan.textContent = `(${current}/${total})`;
        }
        const textSpan = document.getElementById('loader-text');
        if (textSpan) {
            const sections = ['photography', 'cinematography', 'graphicdesign', 'webdev'];
            textSpan.textContent = `📁 Loading ${sections[current-1] || 'assets'}...`;
        }
    }
    
    /**
     * Hide loading indicator
     */
    function hideLoadingIndicator() {
        const indicator = document.getElementById('asset-loader-indicator');
        if (indicator) {
            indicator.style.opacity = '0';
            setTimeout(() => {
                indicator.style.display = 'none';
            }, 500);
        }
    }
    
    /**
     * Fallback: If assets folder is not accessible, show helpful message
     */
    function showNoAssetsMessage() {
        console.warn('⚠️ No assets found! Make sure you have an "assets" folder with subfolders:');
        console.warn('   assets/photography/');
        console.warn('   assets/cinematography/');
        console.warn('   assets/graphic-design/');
        console.warn('   assets/web-dev/');
        
        // Show message in console only, don't annoy users with popups
        const msg = document.createElement('div');
        msg.style.cssText = 'position:fixed; bottom:20px; right:20px; background:#ff5733; color:white; padding:10px 20px; border-radius:8px; font-size:12px; z-index:10000; font-family:monospace; pointer-events:none; opacity:0.9;';
        msg.innerHTML = '📁 Create an "assets" folder with subfolders: photography/, cinematography/, graphic-design/, web-dev/';
        document.body.appendChild(msg);
        setTimeout(() => msg.remove(), 8000);
    }
    
    // ==================== EXPORTS / GLOBAL API ====================
    
    // Make asset loader available globally
    window.AssetLoader = {
        loadAssets: initAssetLoader,
        getAssets: () => assetCache,
        getSectionAssets: getSectionAssets,
        getAllSectionAssets: getAllSectionAssets,
        isLoaded: isAssetsLoaded,
        waitForAssets: waitForAssets,
        refresh: initAssetLoader,
        config: {
            setBasePath: (path) => { ASSETS_BASE_PATH = path; },
            setSectionFolder: (section, folder) => { SECTION_FOLDERS[section] = folder; }
        }
    };
    
    // Auto-start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // Small delay to let other scripts initialize
            setTimeout(initAssetLoader, 100);
        });
    } else {
        setTimeout(initAssetLoader, 100);
    }
    
    // Listen for errors and provide fallback
    window.addEventListener('error', function(e) {
        if (e.message && e.message.includes('fetch')) {
            console.warn('Network error - make sure you are running on a web server (not file:// protocol)');
            console.warn('GitHub Pages works perfectly! For local testing, use: npx serve .');
        }
    });
    
})();