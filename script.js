document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-input');
    const canvas = document.getElementById('collage-canvas');
    const ctx = canvas.getContext('2d');
    const downloadBtn = document.getElementById('download-btn');
    const statusMessage = document.getElementById('status-message');
    const canvasWrapper = document.getElementById('canvas-wrapper');

    let imagesToDraw = []; 
    let isDragging = false;
    let draggedImageIndex = -1;

    // --- FUNGSI UTILITIES ---

    function showStatus(message, isError = false) {
        statusMessage.textContent = message;
        statusMessage.style.backgroundColor = isError ? '#dc3545' : '#ffc107';
        statusMessage.style.color = isError ? 'white' : '#333';
        statusMessage.style.display = 'block';
    }

    function hideStatus() {
        statusMessage.style.display = 'none';
    }
    
    // --- FUNGSI MERESET APLIKASI ---
    function resetApp() {
        // 1. Bersihkan Canvas
        canvas.width = 1; 
        canvas.height = 1;
        ctx.clearRect(0, 0, 1, 1); 

        // 2. Bersihkan variabel data
        imagesToDraw = [];
        
        // 3. Nonaktifkan tombol
        downloadBtn.disabled = true;
        
        // 4. Tampilkan status awal
        showStatus("Silakan pilih gambar untuk memulai.", false);
        
        // CATATAN PENTING: fileInput.value = '' TIDAK ADA DI SINI.
    }
    
    // Panggil fungsi reset saat halaman dimuat
    resetApp();


    // --- LOGIKA UTAMA: Menggambar Kolase ---

    function drawCollage() {
        if (imagesToDraw.length === 0) return;
        
        let maxHeight = 0;
        imagesToDraw.forEach(img => {
            if (img.height > maxHeight) maxHeight = img.height;
        });

        let totalWidth = 0;
        imagesToDraw.forEach(img => {
            const ratio = maxHeight / img.height;
            const newWidth = img.width * ratio;
            
            img.drawWidth = newWidth; 
            img.drawHeight = maxHeight; 

            totalWidth += newWidth;
        });

        canvas.width = totalWidth;
        canvas.height = maxHeight;
        canvas.style.width = '100%';
        canvas.style.height = 'auto';

        let currentX = 0;
        ctx.clearRect(0, 0, totalWidth, maxHeight); 
        
        imagesToDraw.forEach((img, index) => {
            img.canvasX = currentX; 
            img.canvasY = 0;
            img.canvasW = img.drawWidth;
            img.canvasH = img.drawHeight;

            ctx.drawImage(img, currentX, 0, img.drawWidth, img.drawHeight);
            
            if (isDragging && index === draggedImageIndex) {
                ctx.strokeStyle = '#007bff';
                ctx.lineWidth = 5;
                ctx.strokeRect(currentX, 0, img.drawWidth, img.drawHeight);
            }

            currentX += img.drawWidth; 
        });
        
        downloadBtn.disabled = false;

        if (totalWidth > canvasWrapper.offsetWidth * 1.5) { 
             showStatus("Kolase siap! (Geser ke samping untuk melihat seluruhnya). Seret gambar di Kanvas untuk mengatur ulang.", false);
        } else {
             showStatus("Kolase siap diunduh. Seret gambar di Kanvas untuk mengatur ulang.", false);
        }
    }
    
    // --- LOGIKA DRAG & DROP PADA CANVAS ---

    function getCanvasMousePos(event) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        
        let clientX = event.clientX;
        if (event.touches && event.touches.length > 0) {
            clientX = event.touches[0].clientX;
        }

        return {
            x: (clientX - rect.left) * scaleX,
        };
    }

    canvas.addEventListener('mousedown', handleDragStart);
    canvas.addEventListener('touchstart', handleDragStart, { passive: false });

    function handleDragStart(e) {
        e.preventDefault(); 
        if (imagesToDraw.length < 2) return;

        const pos = getCanvasMousePos(e);

        draggedImageIndex = -1;
        for (let i = 0; i < imagesToDraw.length; i++) {
            const img = imagesToDraw[i];
            if (pos.x >= img.canvasX && pos.x <= img.canvasX + img.canvasW) {
                
                draggedImageIndex = i;
                isDragging = true;
                canvasWrapper.classList.add('dragging');
                drawCollage(); 
                break;
            }
        }
    }

    canvas.addEventListener('mousemove', handleDragging);
    canvas.addEventListener('touchmove', handleDragging, { passive: false });

    function handleDragging(e) {
        e.preventDefault();
        if (!isDragging || draggedImageIndex === -1) return;

        const pos = getCanvasMousePos(e);
        const mouseMidpoint = pos.x;

        // Cek kiri
        if (draggedImageIndex > 0) {
            const prevImage = imagesToDraw[draggedImageIndex - 1];
            const swapBoundary = prevImage.canvasX + (prevImage.canvasW / 2);
            if (mouseMidpoint < swapBoundary) {
                [imagesToDraw[draggedImageIndex], imagesToDraw[draggedImageIndex - 1]] = 
                [imagesToDraw[draggedImageIndex - 1], imagesToDraw[draggedImageIndex]];
                draggedImageIndex--; 
                drawCollage(); 
                return;
            }
        }

        // Cek kanan
        if (draggedImageIndex < imagesToDraw.length - 1) {
            const nextImage = imagesToDraw[draggedImageIndex + 1];
            const swapBoundary = nextImage.canvasX + (nextImage.canvasW / 2);
            if (mouseMidpoint > swapBoundary) {
                [imagesToDraw[draggedImageIndex], imagesToDraw[draggedImageIndex + 1]] = 
                [imagesToDraw[draggedImageIndex + 1], imagesToDraw[draggedImageIndex]];
                draggedImageIndex++; 
                drawCollage(); 
                return;
            }
        }
    }

    canvas.addEventListener('mouseup', handleDragEnd);
    canvas.addEventListener('touchend', handleDragEnd);
    canvas.addEventListener('mouseleave', handleDragEnd); 

    function handleDragEnd() {
        if (!isDragging) return;
        isDragging = false;
        draggedImageIndex = -1;
        canvasWrapper.classList.remove('dragging');
        drawCollage(); 
    }

    // --- Event Handler File Input & Download ---

    fileInput.addEventListener('change', (e) => {
        
        const files = e.target.files;

        if (files.length < 2) {
            // Karena resetApp() tidak mengosongkan fileInput.value, kita harus melakukannya di sini
            e.target.value = ''; 
            resetApp(); 
            showStatus("❌ Mohon unggah minimal dua gambar.", true);
            return;
        }

        // Lakukan RESET VISUAL (Canvas dan variabel) sebelum memproses
        imagesToDraw = [];
        downloadBtn.disabled = true;
        
        let loadedCount = 0;
        showStatus(`Memuat ${files.length} gambar...`);
        
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    imagesToDraw.push(img);
                    loadedCount++;
                    
                    if (loadedCount === files.length) {
                        drawCollage(); 
                        // Kosongkan value input di sini agar user bisa upload lagi file yang sama
                        e.target.value = ''; 
                    }
                };
                img.onerror = () => {
                    showStatus(`Gagal memuat satu atau lebih gambar.`, true);
                };
                img.src = e.target.result; 
            };
            reader.readAsDataURL(file); 
        });
    });

    downloadBtn.addEventListener('click', () => {
        if (downloadBtn.disabled) return;
        
        const dataURL = canvas.toDataURL('image/jpeg', 1.0); 
        
        const link = document.createElement('a');
        link.download = `kolase-gabungan-${Date.now()}.jpeg`;
        link.href = dataURL;
        
        document.body.appendChild(link);
        link.click(); 
        document.body.removeChild(link);
        
        showStatus("✅ Kolase berhasil diunduh!", false);
    });
});
