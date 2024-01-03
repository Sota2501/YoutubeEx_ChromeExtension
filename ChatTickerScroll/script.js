class ChatTickerScroll extends Ext {
	static name = "ChatTickerScroll";
	static description = this.i18n("Description");
	static optionsV = 0;
	static ticker;
	static buttons = {
		true: document.querySelector("#ticker #left-arrow-container yt-icon"),
		false: document.querySelector("#ticker #right-arrow-container yt-icon")
	};
	static timeoutHandlers = {
		true: null,
		false: null
	};
	static registOptions(wrapper){
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
	static optionsUpdated(opts){
		if(opts["opt-button-hide"]){
			document.querySelector("yt-live-chat-app").setAttribute("yc-chat-ticker-scroll-button-hide","");
		}else{
			document.querySelector("yt-live-chat-app").removeAttribute("yc-chat-ticker-scroll-button-hide");
		}
	}
	static init(){
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
	static deinit(){
		if(YoutubeState.isChatFrame()){
			document.querySelector("yt-live-chat-app").removeAttribute("yc-chat-ticker-scroll");
			document.querySelector("yt-live-chat-app").removeAttribute("yc-chat-ticker-scroll-button-hide");
			this.ticker.removeEventListener("wheel",this.scrollTicker);
		}
	}
	static scrollTicker = (e)=>{
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
