// ============================================
// Supabase Configuration
// ============================================

// ⚠️ استخدم المفتاح الجديد Publishable Key
const SUPABASE_URL = 'https://cbomnrqxwmflsvigbock.supabase.co';
const SUPABASE_KEY = 'sb_publishable_XySffZObKYUv_NB7FwsKmA_C7DmySUj';

// تهيئة Supabase Client مرة واحدة فقط
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        persistSession: false,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});

// ============================================
// DOM Elements
// ============================================

const noteInput = document.getElementById('noteInput');
const addNoteBtn = document.getElementById('addNoteBtn');
const notesContainer = document.getElementById('notesContainer');
const emptyState = document.getElementById('emptyState');
const loadingState = document.getElementById('loadingState');
const notesCount = document.getElementById('notesCount');
const charCounter = document.getElementById('charCounter');
const currentYear = document.getElementById('currentYear');
const statsContainer = document.getElementById('statsContainer');

// ============================================
// State Variables
// ============================================

let notes = [];
let currentEditId = null;
let isOnline = navigator.onLine;

// ============================================
// Initialize Application
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 تطبيق الملاحظات يعمل');
    
    // Set current year in footer
    currentYear.textContent = new Date().getFullYear();
    
    // Initialize character counter
    updateCharCounter();
    
    // Setup event listeners
    setupEventListeners();
    
    // Check online status
    setupOnlineStatus();
    
    // Test Supabase connection
    testConnection();
    
    // Load notes from Supabase
    loadNotes();
});

// ============================================
// Event Listeners Setup
// ============================================

function setupEventListeners() {
    // Add note button click
    addNoteBtn.addEventListener('click', addNote);
    
    // Add note on Enter key press
    noteInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            addNote();
        }
    });
    
    // Character counter update
    noteInput.addEventListener('input', updateCharCounter);
    
    // Focus on input when app starts
    noteInput.focus();
}

function setupOnlineStatus() {
    // Update online status
    window.addEventListener('online', function() {
        isOnline = true;
        showNotification('تم استعادة الاتصال بالإنترنت', 'success');
        loadNotes();
    });
    
    window.addEventListener('offline', function() {
        isOnline = false;
        showNotification('أنت غير متصل بالإنترنت', 'error');
    });
}

// ============================================
// Character Counter
// ============================================

function updateCharCounter() {
    const length = noteInput.value.length;
    const maxLength = 500;
    charCounter.textContent = `${length}/${maxLength}`;
    
    // Change color based on length
    if (length > maxLength * 0.9) {
        charCounter.style.color = '#ef4444';
        charCounter.style.backgroundColor = '#fee2e2';
    } else if (length > maxLength * 0.75) {
        charCounter.style.color = '#f59e0b';
        charCounter.style.backgroundColor = '#fef3c7';
    } else {
        charCounter.style.color = '#64748b';
        charCounter.style.backgroundColor = '#edf2f7';
    }
}

// ============================================
// CRUD Operations with Supabase
// ============================================

// Test Supabase connection
async function testConnection() {
    try {
        console.log('🔍 اختبار اتصال Supabase...');
        
        const { data, error } = await supabaseClient
            .from('notes')
            .select('id')
            .limit(1);
        
        if (error) {
            console.error('❌ فشل اختبار الاتصال:', error);
            showNotification('فشل الاتصال بقاعدة البيانات: ' + error.message, 'error');
        } else {
            console.log('✅ اتصال Supabase ناجح');
            console.log('📊 البيانات المستلمة:', data);
        }
    } catch (error) {
        console.error('❌ خطأ في اختبار الاتصال:', error);
    }
}

// CREATE: Add a new note
async function addNote() {
    if (!isOnline) {
        showNotification('غير متصل بالإنترنت. لا يمكن إضافة ملاحظات.', 'error');
        return;
    }
    
    const content = noteInput.value.trim();
    
    if (!content) {
        showNotification('الرجاء إدخال نص للملاحظة', 'error');
        noteInput.focus();
        return;
    }
    
    if (content.length > 500) {
        showNotification('النص طويل جداً (الحد الأقصى 500 حرف)', 'error');
        return;
    }
    
    try {
        // Show loading
        addNoteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإضافة...';
        addNoteBtn.disabled = true;
        
        console.log('➕ محاولة إضافة ملاحظة:', content);
        
        // Insert into Supabase
        const { data, error } = await supabaseClient
            .from('notes')
            .insert([
                { 
                    content: content,
                    created_at: new Date().toISOString()
                }
            ])
            .select();
        
        if (error) {
            console.error('❌ خطأ في إضافة الملاحظة:', error);
            console.error('تفاصيل الخطأ:', error.message, error.code, error.details);
            showNotification('فشل إضافة الملاحظة: ' + error.message, 'error');
            return;
        }
        
        console.log('✅ تمت إضافة الملاحظة:', data);
        
        if (data && data.length > 0) {
            // Add to local state
            notes.unshift(data[0]);
            renderNotes();
            
            // Clear input
            noteInput.value = '';
            noteInput.focus();
            updateCharCounter();
            
            showNotification('تم إضافة الملاحظة بنجاح!', 'success');
        }
        
    } catch (error) {
        console.error('❌ خطأ غير متوقع في addNote:', error);
        showNotification('حدث خطأ غير متوقع', 'error');
    } finally {
        // Reset button
        addNoteBtn.innerHTML = '<i class="fas fa-plus"></i><span>إضافة</span>';
        addNoteBtn.disabled = false;
    }
}

// READ: Load all notes
async function loadNotes() {
    if (!isOnline) {
        showNotification('غير متصل بالإنترنت. جاري عرض البيانات المخزنة محلياً.', 'error');
        return;
    }
    
    try {
        // Show loading state
        loadingState.style.display = 'block';
        emptyState.style.display = 'none';
        
        console.log('📥 جاري تحميل الملاحظات...');
        
        // Fetch from Supabase
        const { data, error } = await supabaseClient
            .from('notes')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('❌ خطأ في تحميل الملاحظات:', error);
            showNotification('فشل تحميل الملاحظات: ' + error.message, 'error');
            return;
        }
        
        console.log('✅ الملاحظات المحملة:', data);
        
        // Update local state
        notes = data || [];
        
        // Render notes
        renderNotes();
        
    } catch (error) {
        console.error('❌ خطأ غير متوقع في loadNotes:', error);
        showNotification('حدث خطأ غير متوقع في التحميل', 'error');
    } finally {
        // Hide loading state
        loadingState.style.display = 'none';
    }
}

// UPDATE: Edit an existing note
async function updateNote(id, newContent) {
    if (!isOnline) {
        showNotification('غير متصل بالإنترنت. لا يمكن تحديث الملاحظات.', 'error');
        return false;
    }
    
    if (!newContent.trim()) {
        showNotification('الملاحظة لا يمكن أن تكون فارغة', 'error');
        return false;
    }
    
    if (newContent.length > 500) {
        showNotification('النص طويل جداً (الحد الأقصى 500 حرف)', 'error');
        return false;
    }
    
    try {
        console.log('✏️ تحديث الملاحظة:', id, newContent);
        
        // Update in Supabase
        const { error } = await supabaseClient
            .from('notes')
            .update({ 
                content: newContent,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);
        
        if (error) {
            console.error('❌ خطأ في تحديث الملاحظة:', error);
            showNotification('فشل تحديث الملاحظة: ' + error.message, 'error');
            return false;
        }
        
        // Update local state
        const noteIndex = notes.findIndex(note => note.id === id);
        if (noteIndex !== -1) {
            notes[noteIndex].content = newContent;
            notes[noteIndex].updated_at = new Date().toISOString();
        }
        
        console.log('✅ تم تحديث الملاحظة');
        showNotification('تم تحديث الملاحظة بنجاح!', 'success');
        return true;
        
    } catch (error) {
        console.error('❌ خطأ غير متوقع في updateNote:', error);
        showNotification('حدث خطأ غير متوقع في التحديث', 'error');
        return false;
    }
}

// DELETE: Remove a note
async function deleteNote(id) {
    if (!isOnline) {
        showNotification('غير متصل بالإنترنت. لا يمكن حذف الملاحظات.', 'error');
        return;
    }
    
    // Confirmation dialog
    if (!confirm('هل أنت متأكد من حذف هذه الملاحظة؟')) {
        return;
    }
    
    try {
        console.log('🗑️ حذف الملاحظة:', id);
        
        // Delete from Supabase
        const { error } = await supabaseClient
            .from('notes')
            .delete()
            .eq('id', id);
        
        if (error) {
            console.error('❌ خطأ في حذف الملاحظة:', error);
            showNotification('فشل حذف الملاحظة: ' + error.message, 'error');
            return;
        }
        
        // Remove from local state
        notes = notes.filter(note => note.id !== id);
        
        // Re-render notes
        renderNotes();
        
        console.log('✅ تم حذف الملاحظة');
        showNotification('تم حذف الملاحظة بنجاح!', 'success');
        
    } catch (error) {
        console.error('❌ خطأ غير متوقع في deleteNote:', error);
        showNotification('حدث خطأ غير متوقع في الحذف', 'error');
    }
}

// ============================================
// UI Rendering
// ============================================

// Render all notes
function renderNotes() {
    // Clear container
    notesContainer.innerHTML = '';
    
    // Update count
    notesCount.textContent = notes.length;
    
    // Update stats
    updateStats();
    
    // Show empty state if no notes
    if (notes.length === 0) {
        emptyState.style.display = 'block';
        return;
    }
    
    // Hide empty state
    emptyState.style.display = 'none';
    
    // Render each note
    notes.forEach(note => {
        const noteElement = createNoteElement(note);
        notesContainer.appendChild(noteElement);
    });
}

// Create note element
function createNoteElement(note) {
    const noteCard = document.createElement('div');
    noteCard.className = 'note-card';
    noteCard.dataset.id = note.id;
    
    // Format date
    const createdDate = formatDate(note.created_at);
    const updatedDate = note.updated_at ? formatDate(note.updated_at) : null;
    
    noteCard.innerHTML = `
        <div class="note-content">${escapeHtml(note.content)}</div>
        <div class="note-meta">
            <small><i class="fas fa-calendar-plus"></i> ${createdDate}</small>
            ${updatedDate ? `<small><i class="fas fa-calendar-check"></i> تم التحديث: ${updatedDate}</small>` : ''}
        </div>
        <div class="note-actions">
            <button class="action-btn btn-edit" title="تعديل الملاحظة">
                <i class="fas fa-edit"></i>
            </button>
            <button class="action-btn btn-delete" title="حذف الملاحظة">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    // Add event listeners
    const editBtn = noteCard.querySelector('.btn-edit');
    const deleteBtn = noteCard.querySelector('.btn-delete');
    
    editBtn.addEventListener('click', () => enableEditMode(noteCard, note));
    deleteBtn.addEventListener('click', () => deleteNote(note.id));
    
    return noteCard;
}

// Enable edit mode for a note
function enableEditMode(noteCard, note) {
    if (currentEditId === note.id) return;
    
    currentEditId = note.id;
    noteCard.classList.add('editing');
    
    const originalContent = note.content;
    
    noteCard.innerHTML = `
        <textarea 
            class="note-input edit-input"
            maxlength="500"
            autocomplete="off"
        >${escapeHtml(originalContent)}</textarea>
        <div class="note-actions">
            <button class="action-btn btn-save" title="حفظ التعديلات">
                <i class="fas fa-check"></i>
            </button>
            <button class="action-btn btn-cancel" title="إلغاء التعديل">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Focus and select text
    const input = noteCard.querySelector('.edit-input');
    input.focus();
    input.setSelectionRange(0, input.value.length);
    
    // Add character counter for edit mode
    const charCounterEdit = document.createElement('div');
    charCounterEdit.className = 'char-counter edit-char-counter';
    charCounterEdit.style.marginBottom = '15px';
    charCounterEdit.textContent = `${input.value.length}/500`;
    input.parentNode.insertBefore(charCounterEdit, input.nextSibling);
    
    // Update character counter while typing
    input.addEventListener('input', function() {
        charCounterEdit.textContent = `${this.value.length}/500`;
        
        // Change color based on length
        if (this.value.length > 450) {
            charCounterEdit.style.color = '#ef4444';
            charCounterEdit.style.backgroundColor = '#fee2e2';
        } else if (this.value.length > 375) {
            charCounterEdit.style.color = '#f59e0b';
            charCounterEdit.style.backgroundColor = '#fef3c7';
        } else {
            charCounterEdit.style.color = '#64748b';
            charCounterEdit.style.backgroundColor = '#edf2f7';
        }
    });
    
    // Add event listeners
    const saveBtn = noteCard.querySelector('.btn-save');
    const cancelBtn = noteCard.querySelector('.btn-cancel');
    
    saveBtn.addEventListener('click', async () => {
        const newContent = input.value.trim();
        const success = await updateNote(note.id, newContent);
        
        if (success) {
            currentEditId = null;
            renderNotes();
        }
    });
    
    cancelBtn.addEventListener('click', () => {
        currentEditId = null;
        renderNotes();
    });
    
    // Save on Ctrl+Enter or Cmd+Enter
    input.addEventListener('keydown', async (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            const newContent = input.value.trim();
            const success = await updateNote(note.id, newContent);
            
            if (success) {
                currentEditId = null;
                renderNotes();
            }
        }
        
        // Cancel on Escape
        if (e.key === 'Escape') {
            currentEditId = null;
            renderNotes();
        }
    });
}

// Update statistics
function updateStats() {
    const totalNotes = notes.length;
    const today = new Date().toISOString().split('T')[0];
    const todayNotes = notes.filter(note => 
        note.created_at.split('T')[0] === today
    ).length;
    
    statsContainer.innerHTML = `
        <div class="stat-item">
            <i class="fas fa-clipboard-list"></i>
            <span>العدد الكلي: ${totalNotes}</span>
        </div>
        <div class="stat-item">
            <i class="fas fa-calendar-day"></i>
            <span>ملاحظات اليوم: ${todayNotes}</span>
        </div>
    `;
}

// ============================================
// Utility Functions
// ============================================

// Show notification
function showNotification(message, type = 'info') {
    // Remove existing notification
    const existingNotification = document.getElementById('notificationContainer');
    existingNotification.innerHTML = '';
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.id = 'currentNotification';
    
    notification.innerHTML = `
        <span>${message}</span>
        <button class="close-btn" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add to DOM
    existingNotification.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return 'اليوم';
    } else if (diffDays === 1) {
        return 'أمس';
    } else if (diffDays < 7) {
        return `قبل ${diffDays} أيام`;
    } else {
        return date.toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// Real-time Updates (Optional)
// ============================================
function setupRealtime() {
    try {
        const channel = supabaseClient
            .channel('notes-channel')
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'notes' 
                }, 
                () => {
                    console.log('🔄 تحديث تلقائي للملاحظات');
                    loadNotes();
                }
            )
            .subscribe((status) => {
                console.log('📡 حالة الاتصال المباشر:', status);
            });
    } catch (error) {
        console.error('❌ خطأ في الاتصال المباشر:', error);
    }
}

// تفعيل الاتصال المباشر (اختياري)
setupRealtime();