document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-input');
    const canvas = document.getElementById('collage-canvas');
    const ctx = canvas.getContext('2d');
    const downloadBtn = document.getElementById('download-btn');
    const statusMessage = document.getElementById('status-message');
    const canvasWrapper = document.getElementById('canvas-wrapper');
    // const orderControls = document.getElementById('order-controls'); // Dihapus
    // const sortableList = document.getElementById('sortable-list'); // Dihapus

    let imagesToDraw = []; 
    // let sortableInstance = null; // Dihapus

    // --- Variabel untuk Drag & Drop ---
    let isDragging = false;
    let draggedImageIndex = -1;
    let startDragX = 0; // Posisi X awal saat mulai drag
    let initialImageX = 0; // Posisi X awal gambar yang di-drag
    let currentImageX = 0; // Posisi X gambar yang di-drag saat ini

    // --- Fungsi Utilitas ---

    function showStatus(message, isError = false) {
        statusMessage.textContent = message;
        statusMessage.style.backgroundColor = isError ? '#dc3545' : '#ffc107';
        statusMessage.style.color = isError ? 'white' : '#333';
        statusMessage.style.display = 'block';
    }

    function hideStatus() {
        statusMessage.style.display = 'none';
    }

    // --- LOGIKA UTAMA: Menggambar Kolase ---

    function drawCollage() {
        if (imagesToDraw.length === 0) {
            // orderControls.style.display = 'none'; // Dihapus
            return;
        }
        
        // 1. Tentukan Tinggi Kanvas (diambil dari gambar tertinggi)
        let maxHeight = 0;
        imagesToDraw.forEach(img => {
            if (img.height > maxHeight) maxHeight = img.height;
        });

        // 2. Hitung Lebar Kanvas Total dan Lebar Gambar yang Disesuaikan
        let totalWidth = 0;
        imagesToDraw.forEach(img => {
            const ratio = maxHeight / img.height;
            const newWidth = img.width * ratio;
            
            img.drawWidth = newWidth; 
            img.drawHeight = maxHeight; 

            totalWidth += newWidth;
        });

        // 3. Atur Ukuran Canvas ASLI (Kunci Kualitas Terbaik)
        canvas.width = totalWidth;
        canvas.height = maxHeight;
        
        // Atur ukuran tampilan Canvas di browser (untuk responsif)
        canvas.style.width = '100%';
        canvas.style.height = 'auto';

        // 4. Gambar Semua Gambar ke Canvas
        let currentX = 0;
        ctx.clearRect(0, 0, totalWidth, maxHeight); 
        
        imagesToDraw.forEach((img, index) => {
            // Simpan posisi gambar di Kanvas untuk deteksi klik
            img.canvasX = currentX; 
            img.canvasY = 0;
            img.canvasW = img.drawWidth;
            img.canvasH = img.drawHeight;

            // Gambar gambar ke Kanvas
            ctx.drawImage(img, currentX, 0, img.drawWidth, img.drawHeight);
            
            // Gambar highlight untuk gambar yang sedang di-drag
            if (isDragging && index === draggedImageIndex) {
                ctx.strokeStyle = '#007bff';
                ctx.lineWidth = 5;
                ctx.strokeRect(currentX, 0, img.drawWidth, img.drawHeight);
            }

            currentX += img.drawWidth; 
        });
        
        downloadBtn.disabled = false;
        // orderControls.style.display = 'block'; // Dihapus
        
        if (totalWidth > canvasWrapper.offsetWidth * 1.5) { 
             showStatus("Kolase siap! (Geser ke samping untuk melihat seluruhnya)", false);
        } else {
             showStatus("Kolase siap diunduh. Seret gambar di kolase untuk mengatur ulang.", false);
        }
    }
    
    // --- LOGIKA DRAG & DROP PADA CANVAS ---

    function getCanvasMousePos(event) {
        // Mendapatkan posisi mouse relatif terhadap elemen canvas
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        // Mengatasi event sentuh (touch event)
        let clientX = event.clientX;
        let clientY = event.clientY;
        if (event.touches && event.touches.length > 0) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        }

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    canvas.addEventListener('mousedown', handleDragStart);
    canvas.addEventListener('touchstart', handleDragStart, { passive: false });

    function handleDragStart(e) {
        e.preventDefault(); // Mencegah scrolling default pada touch
        if (imagesToDraw.length < 2) return;

        const pos = getCanvasMousePos(e);

        // Cari gambar yang diklik/disentuh
        draggedImageIndex = -1;
        for (let i = 0; i < imagesToDraw.length; i++) {
            const img = imagesToDraw[i];
            if (pos.x >= img.canvasX && pos.x <= img.canvasX + img.canvasW &&
                pos.y >= img.canvasY && pos.y <= img.canvasY + img.canvasH) {
                
                draggedImageIndex = i;
                isDragging = true;
                startDragX = pos.x; // Posisi X awal mouse/jari
                initialImageX = img.canvasX; // Posisi X awal gambar
                canvasWrapper.classList.add('dragging');
                drawCollage(); // Gambar ulang untuk highlight
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
        const dx = pos.x - startDragX; // Perubahan posisi X mouse/jari

        // Update posisi sementara gambar yang di-drag
        currentImageX = initialImageX + dx;
        
        // Simulasikan pergerakan item yang di-drag (swap jika melewati batas)
        const currentDraggedImage = imagesToDraw[draggedImageIndex];
        const midpointOfDragged = currentImageX + (currentDraggedImage.drawWidth / 2);

        let newIndex = draggedImageIndex;

        // Cek apakah gambar yang di-drag melewati gambar lain ke kiri
        if (draggedImageIndex > 0) {
            const prevImage = imagesToDraw[draggedImageIndex - 1];
            const prevImageMidpoint = prevImage.canvasX + (prevImage.drawWidth / 2);
            if (midpointOfDragged < prevImageMidpoint) {
                // Tukar posisi di array
                [imagesToDraw[draggedImageIndex], imagesToDraw[draggedImageIndex - 1]] = 
                [imagesToDraw[draggedImageIndex - 1], imagesToDraw[draggedImageIndex]];
                draggedImageIndex--; // Update index gambar yang diseret
                // startDragX = pos.x; // Reset startDragX untuk menghindari lompatan
                // initialImageX = imagesToDraw[draggedImageIndex].canvasX;
                drawCollage(); // Gambar ulang
                return;
            }
        }

        // Cek apakah gambar yang di-drag melewati gambar lain ke kanan
        if (draggedImageIndex < imagesToDraw.length - 1) {
            const nextImage = imagesToDraw[draggedImageIndex + 1];
            const nextImageMidpoint = nextImage.canvasX + (nextImage.drawWidth / 2);
            if (midpointOfDragged > nextImageMidpoint) {
                // Tukar posisi di array
                [imagesToDraw[draggedImageIndex], imagesToDraw[draggedImageIndex + 1]] = 
                [imagesToDraw[draggedImageIndex + 1], imagesToDraw[draggedImageIndex]];
                draggedImageIndex++; // Update index gambar yang diseret
                // startDragX = pos.x; // Reset startDragX
                // initialImageX = imagesToDraw[draggedImageIndex].canvasX;
                drawCollage(); // Gambar ulang
                return;
            }
        }
        
        drawCollage(); // Gambar ulang untuk highlight gambar yang sedang di-drag
    }

    canvas.addEventListener('mouseup', handleDragEnd);
    canvas.addEventListener('touchend', handleDragEnd);
    canvas.addEventListener('mouseleave', handleDragEnd); // Jika mouse keluar dari canvas saat drag

    function handleDragEnd() {
        if (!isDragging) return;
        isDragging = false;
        draggedImageIndex = -1;
        canvasWrapper.classList.remove('dragging');
        drawCollage(); // Gambar ulang akhir tanpa highlight
    }

    // --- Event Handler File Input & Download ---

    fileInput.addEventListener('change', (e) => {
        imagesToDraw = []; 
        downloadBtn.disabled = true;
        hideStatus();
        const files = e.target.files;
        // orderControls.style.display = 'none'; // Dihapus

        if (files.length < 2) {
            showStatus("❌ Mohon unggah minimal dua gambar.", true);
            return;
        }

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
                        drawCollage(); // Panggil fungsi gambar setelah semua dimuat
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