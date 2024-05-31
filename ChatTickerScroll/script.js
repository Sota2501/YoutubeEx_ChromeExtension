class ChatTickerScroll extends Ext {
	name = "ChatTickerScroll";
	description = this.i18n("Description");
	optionsV = 0;
	ticker;
	buttons = {
		true: document.querySelector("#ticker #left-arrow-container yt-icon"),
		false: document.querySelector("#ticker #right-arrow-container yt-icon")
	};
	timeoutHandlers = {
		true: null,
		false: null
	};
	registOptions(wrapper){
		(new DOMTemplate(wrapper))
			.ins("append","caption",{
				captionInput: "toggle",
				captionDescription: this.i18n("ButtonHide"),
				toggleOptionName: `${this.name}-opt-button-hide`,
				toggleChecked: (Storage.getOption(`${this.name}-opt-button-hide`,true)?" checked":"")
			},true)
			.on({q:"#ext-yc-toggle",t:"change",f:e=>{
				Storage.setStage(e.target.getAttribute("data-option"),e.target.getAttribute("checked") != null);
			}})
	}
	optionsUpdated(opts){
		if(opts["opt-button-hide"]){
			document.querySelector("yt-live-chat-app").setAttribute("yc-chat-ticker-scroll-button-hide","");
		}else{
			document.querySelector("yt-live-chat-app").removeAttribute("yc-chat-ticker-scroll-button-hide");
		}
	}
	init(){
		if(YoutubeState.isChatFrame()){
			YoutubeEvent.addEventListener("load",()=>{
				document.querySelector("yt-live-chat-app").setAttribute("yc-chat-ticker-scroll","");
				if(Storage.getOption(`${this.name}-opt-button-hide`,true)){
					document.querySelector("yt-live-chat-app").setAttribute("yc-chat-ticker-scroll-button-hide","");
				}
				this.ticker = document.querySelector("#ticker yt-live-chat-ticker-renderer");
				this.ticker.addEventListener("wheel",this.scrollTicker);
			});
		}
	}
	deinit(){
		if(YoutubeState.isChatFrame()){
			document.querySelector("yt-live-chat-app").removeAttribute("yc-chat-ticker-scroll");
			document.querySelector("yt-live-chat-app").removeAttribute("yc-chat-ticker-scroll-button-hide");
			this.ticker.removeEventListener("wheel",this.scrollTicker);
		}
	}
	scrollTicker = (e)=>{
		const left = e.wheelDelta >= 0;
		if(this.timeoutHandlers[left]){
			clearTimeout(this.timeoutHandlers[left]);
		}else{
			if(this.timeoutHandlers[!left]){
				clearTimeout(this.timeoutHandlers[!left]);
				this.timeoutHandlers[!left] = null;
				this.buttons[!left].dispatchEvent(new Event("up"));
			}
			this.buttons[left].dispatchEvent(new Event("down"));
		}
		this.timeoutHandlers[left] = setTimeout(()=>{
			this.timeoutHandlers[left] = null;
			this.buttons[left].dispatchEvent(new Event("up"));
		},500);
	}
}
