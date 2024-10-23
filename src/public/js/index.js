"use strict"


document.addEventListener('DOMContentLoaded', function() {
    // About profile image scailing origin
    const profileImage = document.getElementById('profile-image');
    profileImage.addEventListener('mousemove', function(event) {
        const rect = profileImage.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        profileImage.style.transformOrigin = `${x}px ${y}px`;
    });
});