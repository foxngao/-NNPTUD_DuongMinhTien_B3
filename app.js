// ===== BIẾN TOÀN CỤC =====
let allProducts = [];          // Lưu toàn bộ sản phẩm
let filteredProducts = [];     // Sản phẩm sau khi lọc
let currentPage = 1;           // Trang hiện tại
let pageSize = 10;             // Số sản phẩm mỗi trang
let currentSort = { field: null, order: null }; // Trạng thái sắp xếp
let searchTimeout = null;      // Debounce timeout

// ===== HÀM GETALL - LẤY TOÀN BỘ DỮ LIỆU =====
async function getAll() {
    try {
        const response = await fetch('products.json');
        if (!response.ok) {
            throw new Error('Không thể tải dữ liệu sản phẩm');
        }
        const products = await response.json();
        return products;
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu:', error);
        return [];
    }
}

// ===== KHỞI TẠO ỨNG DỤNG =====
async function init() {
    allProducts = await getAll();
    filteredProducts = [...allProducts];
    setupEventListeners();
    renderProducts();
}

// ===== THIẾT LẬP EVENT LISTENERS =====
function setupEventListeners() {
    // Tìm kiếm - với debounce
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function(e) {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchProducts(e.target.value);
        }, 200);
    });

    // Thay đổi số lượng hiển thị mỗi trang
    const pageSizeSelect = document.getElementById('pageSize');
    pageSizeSelect.addEventListener('change', function(e) {
        pageSize = parseInt(e.target.value);
        currentPage = 1;
        renderProducts();
    });
}

// ===== TÌM KIẾM SẢN PHẨM THEO TITLE =====
function searchProducts(keyword) {
    const searchTerm = keyword.toLowerCase().trim();
    
    if (searchTerm === '') {
        filteredProducts = [...allProducts];
    } else {
        filteredProducts = allProducts.filter(product => 
            product.title.toLowerCase().includes(searchTerm)
        );
    }
    
    if (currentSort.field) {
        applySort();
    }
    
    currentPage = 1;
    renderProducts();
}

// ===== SẮP XẾP SẢN PHẨM =====
function sortProducts(field, order) {
    currentSort = { field, order };
    updateSortButtonState(field, order);
    applySort();
    renderProducts();
}

function applySort() {
    const { field, order } = currentSort;
    
    filteredProducts.sort((a, b) => {
        if (field === 'price') {
            return order === 'asc' ? a.price - b.price : b.price - a.price;
        } else if (field === 'name') {
            const nameA = a.title.toLowerCase();
            const nameB = b.title.toLowerCase();
            return order === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        }
        return 0;
    });
}

function updateSortButtonState(field, order) {
    document.querySelectorAll('.sort-btn').forEach(btn => btn.classList.remove('active'));
    const sortKey = `${field}-${order}`;
    const activeBtn = document.querySelector(`.sort-btn[data-sort="${sortKey}"]`);
    if (activeBtn) activeBtn.classList.add('active');
}

// ===== PHÂN TRANG =====
function getPaginatedProducts() {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredProducts.slice(startIndex, startIndex + pageSize);
}

function getTotalPages() {
    return Math.ceil(filteredProducts.length / pageSize);
}

function goToPage(page) {
    const totalPages = getTotalPages();
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        renderProducts();
    }
}

// ===== XỬ LÝ HÌNH ẢNH =====
function getProductImageUrl(product) {
    // Thử lấy hình ảnh từ mảng images trước
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
        const url = product.images[0];
        if (typeof url === 'string' && url.startsWith('http')) {
            return url;
        }
    }
    // Fallback: dùng hình ảnh từ category
    if (product.category && product.category.image) {
        return product.category.image;
    }
    return null;
}

// Xử lý khi hình ảnh lỗi
function handleImageError(img, productId) {
    // Thử lấy hình ảnh category
    const product = allProducts.find(p => p.id === productId);
    if (product && product.category && product.category.image && img.src !== product.category.image) {
        img.src = product.category.image;
    } else {
        // Nếu vẫn lỗi, hiển thị placeholder
        img.style.display = 'none';
        img.nextElementSibling.style.display = 'flex';
    }
}

// ===== CẮT NGẮN VĂN BẢN =====
function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// ===== RENDER SẢN PHẨM RA BẢNG =====
function renderProducts() {
    const tableBody = document.getElementById('productTableBody');
    const paginatedProducts = getPaginatedProducts();
    
    updateResultsInfo();
    
    if (paginatedProducts.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="loading">Không tìm thấy sản phẩm nào</td></tr>';
        document.getElementById('pagination').innerHTML = '';
        return;
    }
    
    let html = '';
    paginatedProducts.forEach((product) => {
        const imageUrl = getProductImageUrl(product);
        
        html += `
            <tr>
                <td>${product.id}</td>
                <td class="image-cell">
                    ${imageUrl ? `
                        <img src="${imageUrl}" 
                             alt="${product.title}" 
                             class="product-image" 
                             crossorigin="anonymous"
                             referrerpolicy="no-referrer"
                             onload="this.style.display='block'; this.nextElementSibling.style.display='none';"
                             onerror="handleImageError(this, ${product.id})">
                        <div class="image-placeholder" style="display:none;">📷</div>
                    ` : '<div class="image-placeholder">📷</div>'}
                </td>
                <td class="title-cell">${product.title}</td>
                <td class="price">$${product.price}</td>
                <td><span class="category-badge">${product.category?.name || 'N/A'}</span></td>
                <td class="description">${truncateText(product.description, 80)}</td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
    renderPagination();
}

// ===== CẬP NHẬT THÔNG TIN KẾT QUẢ =====
function updateResultsInfo() {
    const resultsInfo = document.getElementById('resultsInfo');
    const total = filteredProducts.length;
    
    if (total === 0) {
        resultsInfo.textContent = 'Không tìm thấy sản phẩm nào';
        return;
    }
    
    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, total);
    resultsInfo.textContent = `Hiển thị ${start} - ${end} / ${total} sản phẩm`;
}

// ===== RENDER PHÂN TRANG =====
function renderPagination() {
    const pagination = document.getElementById('pagination');
    const totalPages = getTotalPages();
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    
    html += `<button class="page-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>◀ Trước</button>`;
    
    const maxVisible = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1);
    }
    
    if (start > 1) {
        html += `<button class="page-btn" onclick="goToPage(1)">1</button>`;
        if (start > 2) html += `<span class="page-info">...</span>`;
    }
    
    for (let i = start; i <= end; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }
    
    if (end < totalPages) {
        if (end < totalPages - 1) html += `<span class="page-info">...</span>`;
        html += `<button class="page-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
    }
    
    html += `<button class="page-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Sau ▶</button>`;
    html += `<span class="page-info">Trang ${currentPage}/${totalPages}</span>`;
    
    pagination.innerHTML = html;
}

// ===== KHỞI CHẠY =====
document.addEventListener('DOMContentLoaded', init);
