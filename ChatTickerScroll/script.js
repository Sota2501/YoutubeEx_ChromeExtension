class ChatTickerScroll extends Ext {
	static name = "ChatTickerScroll";
	static description = this.i18n("Description");
	static optionsV = 0;
	static style = `
		#ticker :is(#left-arrow-container, #right-arrow-container) {
			display: none;
		}
	`;
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
			this.setStyle(this.style);
		}else{
			this.removeStyle(null);
		}
	}
	static init(){
		if(YoutubeState.isChatFrame()){
			YoutubeEvent.addEventListener("load",()=>{
				if(Storage.getOption(`${this.name}-opt-button-hide`,true)){
					this.setStyle(this.style);
				}
				this.ticker = document.querySelector("#ticker yt-live-chat-ticker-renderer");
				this.ticker.addEventListener("wheel",this.scrollTicker);
			});
		}
	}
	static deinit(){
		if(YoutubeState.isChatFrame()){
			this.removeStyle(null);
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
