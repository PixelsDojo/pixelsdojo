// admin.js - Admin Panel JavaScript

// Show / hide modals
function showAddModal() {
    document.getElementById('addModal').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Populate edit modal fields and show it
function editNPC(id, name, location, description, display_order, currentImagePath) {
    document.getElementById('edit_id').value = id;
    document.getElementById('edit_name').value = name;
    document.getElementById('edit_location').value = location || '';
    document.getElementById('edit_description').value = description || '';
    document.getElementById('edit_display_order').value = display_order || 999;

    // Use default image if none exists
    const defaultImage = '/images/defaults/default1.jpg';
    document.getElementById('edit_current_image_path').value = currentImagePath || defaultImage;
    // Optional: show preview if you have an <img id="edit_image_preview">
    const preview = document.getElementById('edit_image_preview');
    if (preview) preview.src = currentImagePath || defaultImage;

    document.getElementById('editModal').style.display = 'block';
}

// Handle ADD NPC form submission
document.getElementById('addForm')?.addEventListener('submit', function(e) {
    e.preventDefault();

    const form = this;
    const formData = new FormData(form);

    fetch('/admin/npcs', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => { throw new Error(err.error || 'Failed to create NPC'); });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            alert('NPC created successfully!');
            closeModal('addModal');
            location.reload(); // refresh list
        } else {
            alert('Creation failed: ' + (data.error || 'Unknown error'));
        }
    })
    .catch(err => {
        console.error('Add NPC error:', err);
        alert('Error creating NPC: ' + err.message);
    });
});

// Handle EDIT NPC form submission
document.getElementById('editForm')?.addEventListener('submit', function(e) {
    e.preventDefault();

    const form = this;
    const formData = new FormData(form);
    const id = formData.get('id'); // from hidden input <input type="hidden" name="id" id="edit_id">

    fetch(`/admin/npcs/${id}/update`, {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => { throw new Error(err.error || `HTTP ${response.status}`); });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            alert('NPC updated successfully!');
            closeModal('editModal');
            location.reload(); // or update DOM dynamically if you prefer
        } else {
            alert('Update failed: ' + (data.error || 'Unknown error'));
        }
    })
    .catch(err => {
        console.error('Edit NPC error:', err);
        alert('Error updating NPC: ' + err.message);
    });
});

// Delete NPC
function deleteNPC(id, name) {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
        fetch(`/admin/npcs/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (response.ok) {
                alert('NPC deleted!');
                location.reload();
            } else {
                return response.json().then(err => {
                    alert('Unable to delete: ' + (err.error || 'Unknown error'));
                });
            }
        })
        .catch(err => {
            alert('Error deleting NPC: ' + err.message);
        });
    }
}

// Delete Page (unchanged - looks good)
function deletePage(id, title) {
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
        fetch(`/admin/pages/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (response.ok) {
                alert('Page deleted!');
                location.reload();
            } else {
                return response.json().then(err => {
                    alert('Unable to delete: ' + (err.error || 'Server error'));
                });
            }
        })
        .catch(err => {
            alert('Error: ' + err.message);
        });
    }
}

// Close modals when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};

// Optional: If you want to preview the uploaded image in add/edit forms
// Add this if you have <img id="add_image_preview"> and <img id="edit_image_preview"> in your HTML
document.getElementById('add_image')?.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(ev) {
            document.getElementById('add_image_preview').src = ev.target.result;
        };
        reader.readAsDataURL(file);
    }
});

document.getElementById('edit_image')?.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(ev) {
            document.getElementById('edit_image_preview').src = ev.target.result;
        };
        reader.readAsDataURL(file);
    }
});
