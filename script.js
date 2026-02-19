// FocuShift Landing Page — Simple enhancements

document.addEventListener("DOMContentLoaded", function () {
    // Update CTA links when you have your TestFlight invite code
    // Replace YOUR_INVITE_CODE with your actual code from App Store Connect
    const testflightUrl = "https://testflight.apple.com/join/YOUR_INVITE_CODE";

    // When you have the real URL, you can set it here and the buttons will use it
    // For now, clicking will go to TestFlight — you'll add your invite code later
    const buttons = document.querySelectorAll('a[href*="YOUR_INVITE_CODE"]');
    buttons.forEach(function (btn) {
        // Optional: open in new tab
        btn.setAttribute("target", "_blank");
        btn.setAttribute("rel", "noopener noreferrer");
    });
});
