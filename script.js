// PDF processing functionality using PDF.js and jsPDF
class PDFProcessor {
    constructor() {
        this.fileInput = document.getElementById('fileInput');
        this.dropZone = document.getElementById('dropZone');
        this.browseBtn = document.getElementById('browseBtn');
        this.processBtn = document.getElementById('processBtn');
        this.clearFilesBtn = document.getElementById('clearFilesBtn');
        this.newProcessBtn = document.getElementById('newProcessBtn');
        this.fileInfo = document.getElementById('fileInfo');
        this.fileList = document.getElementById('fileList');
        this.progressSection = document.getElementById('progressSection');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.resultsSection = document.getElementById('resultsSection');
        this.resultsContainer = document.getElementById('resultsContainer');
        this.errorSection = document.getElementById('errorSection');
        this.errorMessage = document.getElementById('errorMessage');

        this.maxFileSize = 20 * 1024 * 1024; // 20MB
        this.processedFiles = [];
        this.isProcessing = false;

        this.initEventListeners();
    }

    initEventListeners() {
        // File input change - only display files, don't process automatically
        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                this.handleFileSelection(e.target.files);
            }
        });

        // Browse button click
        this.browseBtn.addEventListener('click', () => {
            this.fileInput.value = ''; // Reset input to allow same file selection
            this.fileInput.click();
        });

        // Process button click
        this.processBtn.addEventListener('click', () => {
            this.processSelectedFiles();
        });

        // Clear files button click
        this.clearFilesBtn.addEventListener('click', () => {
            this.clearSelectedFiles();
        });

        // New process button click
        this.newProcessBtn.addEventListener('click', () => {
            this.resetToUploadState();
        });

        // Drag and drop events
        this.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dropZone.classList.add('dragover');
        });

        this.dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.dropZone.classList.remove('dragover');
        });

        this.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dropZone.classList.remove('dragover');
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
                this.handleFileSelection(files);
            }
        });

        this.dropZone.addEventListener('click', () => {
            this.fileInput.value = ''; // Reset input to allow same file selection
            this.fileInput.click();
        });
    }

    handleFileSelection(files) {
        const validFiles = Array.from(files).filter(file => {
            if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                this.showError('Please select only PDF files.');
                return false;
            }
            if (file.size > this.maxFileSize) {
                this.showError(`File ${file.name} exceeds 20MB limit.`);
                return false;
            }
            return true;
        });

        if (validFiles.length > 0) {
            this.selectedFiles = validFiles;
            this.displayFileInfo(validFiles);
        }
    }

    clearSelectedFiles() {
        this.selectedFiles = [];
        this.fileInfo.style.display = 'none';
        this.fileList.innerHTML = '';
    }

    resetToUploadState() {
        this.clearSelectedFiles();
        this.resultsSection.style.display = 'none';
        this.progressSection.style.display = 'none';
        this.errorSection.style.display = 'none';
    }

    processSelectedFiles() {
        if (this.isProcessing) return; // Prevent processing if already processing
        if (!this.selectedFiles || this.selectedFiles.length === 0) {
            this.showError('Please select files to process first.');
            return;
        }

        this.processFiles(this.selectedFiles);
    }

    displayFileInfo(files) {
        this.fileList.innerHTML = '';
        files.forEach(file => {
            const li = document.createElement('li');
            li.innerHTML = `
                <svg class="file-item-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <div class="file-item-info">
                    <div class="file-item-name" title="${file.name}">${file.name}</div>
                    <div class="file-item-details">
                        <span class="file-item-size">${this.formatFileSize(file.size)}</span>
                    </div>
                </div>
            `;
            this.fileList.appendChild(li);
        });
        this.fileInfo.style.display = 'block';
    }

    async processFiles(files) {
        this.progressSection.style.display = 'block';
        this.resultsSection.style.display = 'none';
        this.errorSection.style.display = 'none';

        this.processedFiles = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const progress = ((i + 1) / files.length) * 100;
            
            this.progressFill.style.width = `${progress}%`;
            this.progressText.textContent = `${Math.round(progress)}% - Processing ${file.name}...`;

            try {
                const processedBlob = await this.processSinglePDF(file);
                this.processedFiles.push({
                    originalName: file.name,
                    blob: processedBlob,
                    originalFile: file
                });
            } catch (error) {
                console.error('Error processing file:', error);
                this.showError(`Error processing ${file.name}: ${error.message}`);
                return;
            }
        }

        this.showResults();
    }

    async processSinglePDF(file) {
        try {
            // Configure PDF.js worker
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const pageCount = pdf.numPages;

            if (pageCount < 2) {
                // If PDF has less than 2 pages, return as is
                return new Blob([arrayBuffer], { type: 'application/pdf' });
            }

            // Get first and last page content as text/objects to preserve format
            const firstPage = await pdf.getPage(1);
            const lastPage = await pdf.getPage(pageCount);
            
            // For text-based extraction, we'll create a new approach
            // Since PDF.js doesn't directly support page copying in the same way as pdf-lib,
            // we'll use a workaround by extracting page content and rebuilding
            
            // This is a simplified approach - in practice, for true text-based extraction
            // we would need to extract text content and rebuild, but that's complex
            // Instead, let's use the render approach but with better optimization
            
            // Create canvases for first and last pages
            const firstCanvas = document.createElement('canvas');
            const firstCtx = firstCanvas.getContext('2d');
            const firstViewport = firstPage.getViewport({ scale: 1.5 });
            
            firstCanvas.height = firstViewport.height;
            firstCanvas.width = firstViewport.width;
            
            await firstPage.render({
                canvasContext: firstCtx,
                viewport: firstViewport
            }).promise;
            
            const lastCanvas = document.createElement('canvas');
            const lastCtx = lastCanvas.getContext('2d');
            const lastViewport = lastPage.getViewport({ scale: 1.5 });
            
            lastCanvas.height = lastViewport.height;
            lastCanvas.width = lastViewport.width;
            
            await lastPage.render({
                canvasContext: lastCtx,
                viewport: lastViewport
            }).promise;
            
            // Now use jsPDF to create a new PDF with the extracted pages
            // But first let me check if jsPDF is available, if not, I'll use a different approach
            if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
                // If jsPDF is not available, we'll need to handle this differently
                // For now, let's try to dynamically load it
                await this.loadJsPDF();
            }
            
            const { jsPDF } = window.jspdf;
            const newPdf = new jsPDF();
            
            // Add first page
            const firstImgData = firstCanvas.toDataURL('image/jpeg', 0.8); // Use JPEG for compression
            newPdf.addImage(firstImgData, 'JPEG', 0, 0, firstCanvas.width / 4, firstCanvas.height / 4);
            
            // Add last page if it's different from first
            if (pageCount > 1) {
                newPdf.addPage();
                const lastImgData = lastCanvas.toDataURL('image/jpeg', 0.8); // Use JPEG for compression
                newPdf.addImage(lastImgData, 'JPEG', 0, 0, lastCanvas.width / 4, lastCanvas.height / 4);
            }
            
            return new Blob([newPdf.output('arraybuffer')], { type: 'application/pdf' });
        } catch (error) {
            console.error('PDF processing error:', error);
            throw new Error(`Invalid PDF file: ${error.message}`);
        }
    }

    async loadJsPDF() {
        return new Promise((resolve, reject) => {
            if (window.jspdf && window.jspdf.jsPDF) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = () => {
                // Wait a bit more for the library to be fully initialized
                setTimeout(resolve, 100);
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    showResults() {
        this.progressSection.style.display = 'none';
        
        // Hide upload panel and file selection area after processing
        this.uploadArea = this.uploadArea || document.querySelector('.upload-area');
        if (this.uploadArea) {
            this.uploadArea.style.display = 'none';
        }
        
        this.resultsContainer.innerHTML = '';

        this.processedFiles.forEach((processedFile, index) => {
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item fade-in';
            
            const fileName = processedFile.originalName.replace('.pdf', '') + '_first_last_pages.pdf';
            
            resultItem.innerHTML = `
                <div class="result-item-content">
                    <h4 title="${fileName}">${fileName}</h4>
                    <p>Size: ${this.formatFileSize(processedFile.blob.size)}</p>
                    <p>Original: ${this.formatFileSize(processedFile.originalFile.size)} (${processedFile.originalFile.name})</p>
                </div>
                <div class="result-item-actions">
                    <button class="btn btn-primary" onclick="pdfProcessor.downloadFile(${index})">
                        Download PDF
                    </button>
                </div>
            `;
            
            this.resultsContainer.appendChild(resultItem);
        });

        this.resultsSection.style.display = 'block';
    }

    resetToUploadState() {
        this.clearSelectedFiles();
        this.resultsSection.style.display = 'none';
        this.progressSection.style.display = 'none';
        this.errorSection.style.display = 'none';
        
        // Show upload panel again
        this.uploadArea = this.uploadArea || document.querySelector('.upload-area');
        if (this.uploadArea) {
            this.uploadArea.style.display = 'block';
        }
    }

    downloadFile(index) {
        const processedFile = this.processedFiles[index];
        const fileName = processedFile.originalName.replace('.pdf', '') + '_first_last_pages.pdf';
        
        const url = URL.createObjectURL(processedFile.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    showError(message) {
        this.errorSection.style.display = 'block';
        this.errorMessage.textContent = message;
        this.progressSection.style.display = 'none';
        this.resultsSection.style.display = 'none';
        
        setTimeout(() => {
            this.errorSection.style.display = 'none';
        }, 500);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Initialize the PDF processor when the page loads
let pdfProcessor;
document.addEventListener('DOMContentLoaded', () => {
    pdfProcessor = new PDFProcessor();
});

// Export for global access
window.PDFProcessor = PDFProcessor;
