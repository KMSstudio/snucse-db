
function openUploadPopup(path) {
    const popup = window.open(`/upload/${path}`, "Upload File", "width=400,height=250");
    if (window.focus) popup.focus();
}

function openCreatePopup(path) {
    const popup = window.open(`/create/${path}`, "Create Folder", "width=400,height=250");
    if (window.focus) popup.focus();
}

function downloadZip(path) {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `/zip/${path}`;
    document.body.appendChild(form);
    form.submit();
}