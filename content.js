const extensions = {};
function init(){
	const exts = [
		CommentPicker,
		FullscreenChat,
		ChatTickerScroll
	];
	for(let ex of exts){
		extensions[ex.name] = ex;
	}
	YoutubeEvent.addEventListener("storageLoad",()=>{
		YoutubeEvent.dispatchEvent("exLoad");
	});
}

if(YoutubeState.parentsFrameIsYT() != false){
	init();
}
