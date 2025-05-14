/*
 * Tool to create a manifest file for emojis
 * 
 * The SVG emoji files used in this project are from Google Noto Emoji:
 * Copyright 2013 Google, Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0
 */

const fs = require('fs');
const path = require('path');

// Path to emojis_svg directory relative to this script
const EMOJIS_SVG_DIR = './emojis_svg';
const OUTPUT_FILE = 'emoji-manifest.json';

// Function to check if an SVG file has copyright info
function hasCopyrightInfo(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return content.includes('Copyright') || content.includes('copyright');
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        return false;
    }
}

// Function to add copyright info to an SVG file if it doesn't have it
function addCopyrightInfo(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        if (!hasCopyrightInfo(filePath)) {
            const insertPoint = content.indexOf('<svg');
            if (insertPoint !== -1) {
                const commentText = '<!-- Copyright 2013 Google, Inc. All Rights Reserved. Licensed under the Apache License, Version 2.0 -->\n';
                content = content.slice(0, insertPoint) + commentText + content.slice(insertPoint);
                fs.writeFileSync(filePath, content, 'utf8');
                console.log(`Added copyright info to ${filePath}`);
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error(`Error updating file ${filePath}:`, error);
        return false;
    }
}

// Function to get all SVG files
function getSvgFiles(directory) {
    try {
        const files = fs.readdirSync(directory);
        return files
            .filter(file => file.endsWith('.svg'))
            .map(file => `emojis_svg/${file}`);
    } catch (error) {
        console.error(`Error reading directory ${directory}:`, error);
        return [];
    }
}

// Main function
function createManifest() {
    try {
        // Check if the directory exists
        if (!fs.existsSync(EMOJIS_SVG_DIR)) {
            console.error(`Directory ${EMOJIS_SVG_DIR} does not exist.`);
            console.log('Please create the directory and copy SVG files into it.');
            return;
        }
        
        // Get all SVG files
        const emojiFiles = getSvgFiles(EMOJIS_SVG_DIR);
        
        if (emojiFiles.length === 0) {
            console.error('No SVG files found in the directory.');
            return;
        }
        
        // Check and add copyright info to files that don't have it
        let filesUpdated = 0;
        emojiFiles.forEach(relativeFile => {
            const absoluteFile = path.resolve(EMOJIS_SVG_DIR, path.basename(relativeFile));
            if (addCopyrightInfo(absoluteFile)) {
                filesUpdated++;
            }
        });
        
        if (filesUpdated > 0) {
            console.log(`Updated ${filesUpdated} files with copyright information.`);
        } else {
            console.log('All files already have copyright information.');
        }
        
        // Write to manifest file
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(emojiFiles, null, 2));
        
        console.log(`Created manifest with ${emojiFiles.length} emoji files.`);
        console.log(`Manifest saved to ${OUTPUT_FILE}`);
    } catch (error) {
        console.error('Error creating manifest:', error);
    }
}

// Run the main function
createManifest();