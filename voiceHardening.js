// Batch 7 — voice safety/reliability helpers.
(function(){
 function lang(){return window.BabiVoice?.current?.()||'ta'}
 function stop(){try{window.speechSynthesis?.cancel()}catch{}}
 function speak(text){if(!text)return false;if(window.BabiVoice?.say)return window.BabiVoice.say(text,text);return false}
 function listenAvailable(){return !!(window.SpeechRecognition||window.webkitSpeechRecognition)}
 window.BabiVoiceHardening={language:lang,stop,speak,listenAvailable};
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()},{passive:true});
})();
