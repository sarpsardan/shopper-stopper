window.addEventListener('DOMContentLoaded', (event) => {
    const audio = document.querySelector('audio');
    if (audio) {
      audio.volume = 0.3;
      audio.play().catch(function(error) {
        console.log("Audio play failed:", error);
      });
    }
  });