document.addEventListener("DOMContentLoaded", function() {
    // --- Основні змінні ---
    const searchInput = document.getElementById('searchInput');
    const productRows = Array.from(document.querySelectorAll('.product-row'));
    const filtersToggleBtn = document.getElementById('filters-toggle-btn');
    const filtersContainer = document.getElementById('filters-container');
    const contentRow = document.getElementById('content-row');
    const filtersToggleText = document.getElementById('filters-toggle-text');
    const filtersForm = document.getElementById('filters-form');
    const priceFromInput = document.getElementById('priceFrom');
    const priceToInput = document.getElementById('priceTo');
    const categoryCheckboxes = filtersForm.querySelectorAll('input[name="category"]');
    const manufacturerCheckboxes = filtersForm.querySelectorAll('input[name="manufacturer"]');
    let filtersVisible = true;

    // --- Ініціалізація значень цінових фільтрів ---
    const allPrices = Array.from(document.querySelectorAll('td[data-price]')).map(td => parseFloat(td.getAttribute('data-price')));
    const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0;
    const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 0;

    priceFromInput.value = minPrice;
    priceToInput.value = maxPrice;
    priceFromInput.min = minPrice;
    priceToInput.max = maxPrice;

    // --- Показ/приховування фільтрів по кліку ---
    filtersToggleBtn.addEventListener('click', function() {
        filtersVisible = !filtersVisible;
        if (filtersVisible) {
            filtersContainer.classList.remove('hidden');
            contentRow.classList.remove('full-width');
            filtersToggleText.textContent = "";
        } else {
            filtersContainer.classList.add('hidden');
            contentRow.classList.add('full-width');
            filtersToggleText.textContent = "";
        }
    });

    // --- Пошук товарів ---
    searchInput.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase().trim();
        productRows.forEach(row => {
            const productName = row.dataset.name;
            if (productName && productName.toLowerCase().includes(searchTerm)) { // Added null check for productName
                row.classList.remove('hidden');
            } else {
                row.classList.add('hidden');
            }
        });
        updateFilteredIndexes();
        showPage(1);
    });

    // --- Фільтри ---
    priceFromInput.addEventListener('input', filterProducts);
    priceToInput.addEventListener('input', filterProducts);
    categoryCheckboxes.forEach(cb => cb.addEventListener('change', filterProducts));
    manufacturerCheckboxes.forEach(cb => cb.addEventListener('change', filterProducts));

    function filterProducts() {
        const selectedCategories = Array.from(categoryCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
        const selectedManufacturers = Array.from(manufacturerCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
        const minPriceFilter = parseFloat(priceFromInput.value);
        const maxPriceFilter = parseFloat(priceToInput.value);

        productRows.forEach(row => {
            const rowCategory = row.querySelector('td[data-category]')?.getAttribute('data-category');
            const rowManufacturer = row.querySelector('td[data-manufacturer]')?.textContent?.trim();
            const rowPrice = parseFloat(row.querySelector('td[data-price]')?.getAttribute('data-price')); // Added null check

            // Ensure all data attributes are present before trying to use them
            if (rowCategory === null || rowManufacturer === null || isNaN(rowPrice)) {
                row.classList.add('hidden');
                return;
            }

            const matchCategory = selectedCategories.length === 0 || selectedCategories.includes(rowCategory);
            const matchManufacturer = selectedManufacturers.length === 0 || selectedManufacturers.includes(rowManufacturer);
            const matchPrice = rowPrice >= minPriceFilter && rowPrice <= maxPriceFilter;

            if (matchCategory && matchManufacturer && matchPrice) {
                row.classList.remove('hidden');
            } else {
                row.classList.add('hidden');
            }
        });

        updateFilteredIndexes();
        showPage(1);
    }

    // --- Приховати товари з незаповненими колонками (залишаємо як є) ---
    productRows.forEach(row => {
        const name = row.querySelector('td[data-name]')?.getAttribute('data-name')?.trim();
        const price = row.querySelector('td[data-price]')?.getAttribute('data-price')?.trim();
        const quantity = row.querySelector('td[data-quantity]')?.getAttribute('data-quantity')?.trim();
        const category = row.querySelector('td[data-category]')?.getAttribute('data-category')?.trim();
        const manufacturer = row.querySelector('td[data-manufacturer]')?.textContent?.trim();
        const barcode = row.querySelector('.barcode')?.getAttribute('data-value')?.trim();

        if (!name || !price || !quantity || !category || !manufacturer || !barcode) {
            row.classList.add('hidden');
        }
    });

    // --- Pagination ---
    const rowsPerPage = 10;
    let currentPage = 1;
    let filteredIndexes = [];
    const paginationDiv = document.getElementById('pagination'); // Отримуємо елемент пагінації

    function updateFilteredIndexes() {
        filteredIndexes = [];
        productRows.forEach((row, idx) => {
            if (!row.classList.contains('hidden')) filteredIndexes.push(idx);
        });
    }

    function showPage(page) {
        currentPage = page;
        productRows.forEach(row => row.style.display = 'none');
        const start = (page - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        filteredIndexes.slice(start, end).forEach(idx => {
            productRows[idx].style.display = '';
        });
        renderPagination();
    }

    function renderPagination() {
        paginationDiv.innerHTML = '';
        const totalPages = Math.ceil(filteredIndexes.length / rowsPerPage);
        if (totalPages <= 1) return;

        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement('button');
            btn.textContent = i;
            btn.className = 'pagination-btn' + (i === currentPage ? ' active' : '');
            btn.addEventListener('click', () => showPage(i));
            paginationDiv.appendChild(btn);
        }
    }

    // --- Сортування таблиці ---
    function sortTable(column, type, order) {
        const tbody = document.querySelector('#product-table-body');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        rows.sort((a, b) => {
            let aValue = a.querySelector(`td[data-${column}]`).getAttribute(`data-${column}`);
            let bValue = b.querySelector(`td[data-${column}]`).getAttribute(`data-${column}`);
            if (type === 'number') {
                aValue = parseFloat(aValue);
                bValue = parseFloat(bValue);
            } else {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }
            if (order === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else if (order === 'desc') {
                return aValue < bValue ? 1 : -1;
            }
            return 0;
        });
        while (tbody.firstChild) {
            tbody.removeChild(tbody.firstChild);
        }
        rows.forEach(row => tbody.appendChild(row));
    }

    const headers = document.querySelectorAll('th[data-sort]');
    headers.forEach(header => {
        let sortOrder = 'none';
        header.addEventListener('click', () => {
            const column = header.getAttribute('data-sort');
            const type = header.getAttribute('data-type');
            headers.forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
            if (sortOrder === 'none') {
                sortOrder = 'asc';
                header.classList.add('sort-asc');
            } else if (sortOrder === 'asc') {
                sortOrder = 'desc';
                header.classList.add('sort-desc');
            } else {
                sortOrder = 'none';
                location.reload();
                return;
            }
            if (sortOrder !== 'none') {
                sortTable(column, type, sortOrder);
            }
        });
    });

    // --- Видалення товарів ---
    document.querySelectorAll('.delete-button').forEach(button => {
        button.addEventListener('click', async () => {
            const productId = button.getAttribute('data-id');
            const confirmDelete = confirm('Ви впевнені, що хочете видалити цей товар?');
            if (confirmDelete) {
                try {
                    const response = await fetch(`/api/products/delete/${productId}`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    if (!response.ok) {
                        let errorData;
                        const responseText = await response.text(); // Consume once
                        try {
                            errorData = JSON.parse(responseText);
                        } catch (jsonParseError) {
                            errorData = { error: `Серверна помилка: ${response.status} ${response.statusText || ''}` };
                            if (responseText) {
                                errorData.error += ` - ${responseText.substring(0, 100)}...`; // Limit text length
                            }
                        }
                        alert(errorData.error);
                        return;
                    }
                    window.location.reload();
                } catch (error) {
                    console.error('Error deleting product:', error);
                    alert('Сталася помилка при видаленні товару');
                }
            }
        });
    });

    // --- Перемикання вигляду Таблиця/Слайдер --- (Removed Slider-related Toggles)
    // Removed document.getElementById('toggle-view') and document.getElementById('toggle-view-slider') event listeners entirely.

    // --- Клікабельні рядки ---
    var rows = document.querySelectorAll(".clickable-row");
    rows.forEach(function(row) {
        row.addEventListener("click", function() {
            window.location.href = row.dataset.href;
        });
    });

    // --- Пагінація ---
    updateFilteredIndexes();
    showPage(1);

    // --- Генерація штрих-кодів ---
    function generateBarcode(element, value) {
        if (element && value) {
            JsBarcode(element, value, {
                format: "CODE128",
                width: 1.5,
                height: 40,
                displayValue: false,
                margin: 5
            });
        }
    }

    // Initial barcode generation for all existing barcodes
    document.querySelectorAll('.barcode').forEach(function(barcodeElement) {
        const value = barcodeElement.dataset.value;
        generateBarcode(barcodeElement, value);
    });

    // Приховуємо кнопку "Реєстрація" якщо userType існує
    const userType = "<%= userType %>";
    const userLogin = "<%= userLogin %>";

    if (userType) {
        const registerUserLinkParent = document.querySelector('a[href="/register_user"]');
        if (registerUserLinkParent) {
            registerUserLinkParent.parentElement.classList.add('hide-on-auth');
        }
    }

    if (userType === 'user') {
        const btn = document.getElementById('register-product-btn');
        if (btn) {
            btn.style.display = 'none';
        }
    }

    // --- Редагування товарів ---
    document.querySelectorAll('.edit-button').forEach(button => {
        button.addEventListener('click', function() {
            const row = this.closest('.product-row');
            const productId = row.dataset.id;
            const originalValues = {};

            if (row.classList.contains('editing')) {
                saveProduct(row, productId);
            } else {
                row.classList.add('editing');
                const productFields = row.querySelectorAll('.product-field');

                productFields.forEach(field => {
                    const fieldName = field.dataset.field;
                    // Зберігаємо оригінальне значення
                    originalValues[fieldName] = field.textContent.replace(' грн', '').trim();

                    if (fieldName === 'name' || fieldName === 'manufacturer') {
                        field.innerHTML = `<input type="text" class="editable-field" data-field="${fieldName}" value="${originalValues[fieldName]}">`;
                    } else if (fieldName === 'bar_code') {
                        // Отримуємо контейнер штрих-коду
                        const barcodeContainer = field.closest('.barcode-container');
                        if (barcodeContainer) {
                            // Приховуємо SVG зображення штрих-коду
                            const barcodeSVG = barcodeContainer.querySelector('.barcode');
                            if (barcodeSVG) {
                                barcodeSVG.style.display = 'none';
                            }
                            // Залишаємо числовий штрих-код і перетворюємо його на input
                            field.innerHTML = `<input type="number" class="editable-field" data-field="${fieldName}" value="${originalValues[fieldName]}">`;
                        }
                    } else {
                        field.innerHTML = `<input type="${(fieldName === 'price' || fieldName === 'quantity') ? 'number' : 'text'}" class="editable-field" data-field="${fieldName}" value="${originalValues[fieldName]}">`;
                    }
                });

                this.textContent = 'Зберегти';
                this.classList.remove('edit-button');
                this.classList.add('save-button');

                const deleteButton = row.querySelector('.delete-button');
                if (deleteButton) deleteButton.style.display = 'none';

                const cancelButton = document.createElement('button');
                cancelButton.textContent = 'Скасувати';
                cancelButton.classList.add('cancel-button');
                cancelButton.addEventListener('click', () => cancelEdit(row, originalValues));
                this.parentNode.insertBefore(cancelButton, this.nextSibling);
            }
        });
    });

    async function saveProduct(row, productId) {
        const updatedData = {};
        let isValid = true;
        const inputs = row.querySelectorAll('.editable-field');

        inputs.forEach(input => {
            const fieldName = input.dataset.field;
            let value = input.value.trim();

            if (fieldName === 'price' || fieldName === 'quantity' || fieldName === 'bar_code') {
                value = parseFloat(value);
                if (isNaN(value) || value < 0) {
                    alert(`Будь ласка, введіть дійсне число для поля "${fieldName}".`);
                    isValid = false;
                    return;
                }
            }
            if (fieldName === 'bar_code' && (!value || String(value).length !== 13)) { // Changed to 13
                alert('Штрих-код має бути 13-значним числом.');
                isValid = false;
                return;
            }

            updatedData[fieldName] = value;
        });

        if (!isValid) return;

        try {
            const response = await fetch(`/api/products/edit/${productId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            });

            if (!response.ok) {
                const responseText = await response.text();
                let errorDetails = 'Невідома помилка';

                try {
                    const errorData = JSON.parse(responseText);
                    errorDetails = errorData.error || errorData.message || 'Помилка оновлення товару';
                } catch (jsonParseError) {
                    if (!responseText || responseText.trim() === '') {
                        errorDetails = `Помилка сервера: Статус ${response.status} ${response.statusText}`;
                    } else {
                        errorDetails = `Помилка сервера: ${responseText}`;
                    }
                }
                throw new Error(errorDetails);
            }

            // Перезавантажити сторінку для відображення змін та скидання стану
            // Якщо ви не перезавантажуєте сторінку, вам потрібно буде відновити вигляд штрих-коду вручну тут
            window.location.reload();

        } catch (error) {
            console.error('Error saving product:', error);
            alert(`Помилка: ${error.message}`);
        }
    }

    function cancelEdit(row, originalValues) {
        row.classList.remove('editing');
        const productFields = row.querySelectorAll('.product-field');

        productFields.forEach(field => {
            const fieldName = field.dataset.field;
            let originalValue = originalValues[fieldName];

            if (fieldName === 'name') {
                field.innerHTML = `<a href="/product/${row.dataset.id}" class="product-name-link" data-field="name">${originalValue}</a>`;
            } else if (fieldName === 'manufacturer') {
                field.innerHTML = `<a href="/manufacturer/${originalValue}" class="manufacturer-link">${originalValue}</a>`;
            } else if (fieldName === 'price') {
                field.innerHTML = `${originalValue} грн`;
            } else if (fieldName === 'bar_code') {
                // Відновлюємо контейнер штрих-коду та генеруємо штрих-код для оригінального значення
                field.innerHTML = `<div class="barcode-container"><svg class="barcode" data-value="${originalValue}"></svg><div class="barcode-number product-field" data-field="bar_code">${originalValue}</div></div>`;
                const barcodeSVG = field.querySelector('.barcode');
                // Показуємо SVG зображення штрих-коду
                if (barcodeSVG) {
                    barcodeSVG.style.display = ''; // або 'block'
                }
                generateBarcode(barcodeSVG, originalValue);
            } else {
                field.textContent = originalValue;
            }
        });

        const saveButton = row.querySelector('.save-button');
        if (saveButton) {
            saveButton.textContent = 'Редагувати';
            saveButton.classList.remove('save-button');
            saveButton.classList.add('edit-button');
        }

        const deleteButton = row.querySelector('.delete-button');
        if (deleteButton) deleteButton.style.display = ''; // Показуємо кнопку видалення знову

        const cancelButton = row.querySelector('.cancel-button');
        if (cancelButton) cancelButton.remove();
    }
});