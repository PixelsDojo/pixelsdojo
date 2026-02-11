// Admin Panel JavaScript

function showAddModal() {
    document.getElementById('addModal').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function editNPC(id, name, location, description, displayOrder) {
    function editNPC(id, name, location, description, display_order, currentImagePath) {
  document.getElementById('edit_id').value = id;
  document.getElementById('edit_name').value = name;
  document.getElementById('edit_location').value = location;
  document.getElementById('edit_description').value = description || '';
  document.getElementById('edit_display_order').value = display_order;
  document.getElementById('edit_current_image_path').value = currentImagePath || '/images/npcs/default-npc.png';

  // Set the form action to the correct route
  document.getElementById('editForm').action = '/admin/npcs/' + id;

  // Show the modal
  document.getElementById('editModal').style.display = 'block';
}

    function deleteNPC(id, name) {
  if (confirm(`Delete "${name}" forever?`)) {
    fetch(`/admin/npcs/${id}`, {
      method: 'DELETE'
    })
    .then(res => {
      if (res.ok) {
        location.reload();
      } else {
        alert('Failed to delete');
      }
    })
    .catch(err => alert('Error: ' + err));
  }
}

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
        location.reload(); // refresh admin to show updated list
      } else {
        response.json().then(err => {
          alert('Unable to delete: ' + (err.error || 'Server error'));
        });
      }
    })
    .catch(err => {
      alert('Error: ' + err);
    });
  }
}
    
// Close modals on outside click
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}
