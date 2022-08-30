class YoutubeState {
	/**
	 * フレームがiframeかどうか
	 */
	static isChildFrame(){
		return top != window;
	}
}

class YoutubeEvent {
	static events = {
		once: {
			load: {
				type: "load",
				window: true,
				options: {
					once: true
				}
			},
			allLoad: {
				type: "ext-yc-all-load",
				window: true,
				options: {
					once: true
				}
			},
			connected: {
				type: "ext-yc-connected",
				window: true,
				options: {
					once: true
				}
			}
		},
		youtube: {
			ytLoad: {
				type: "yt-navigate-finish",
				window: false
			},
			ytFullscreen: {
				type: "yt-action",
				window: false,
				query: "ytd-app",
				func: (e,c)=>{
					if(e.detail?.actionName == 'yt-fullscreen-change-action'){
						c(e);
					}
				}
			},
			ytDebug: {
				type: "yt-action",
				window: false,
				query: "ytd-app",
				func: (e,c)=>{
					if(e.detail){
						c(e.detail);
					}
				}
			}
		},
		signal: {
			regist: {
				type: "ext-yt-sig-regist",
				window: true,
				func: (e,c)=>{
					this.frame = e.detail.window;
					c(e);
				}
			},
			dispatch: {
				type: "ext-yc-sig-dispatch",
				window: true,
				func: e=>{
					this.dispatchEvent(e.detail.type);
				}
			}
		}
	}
	static frame = null;
	static init(){
		for(const type in this.events.once){
			this.addEventListener(type, e=>{this.events.once[type] = e});
		}
		if(YoutubeState.isChildFrame()){
			this.addEventListener("allLoad",e=>{
				let id;
				this.#addEventListener(this.events.signal.regist,e=>{
					clearInterval(id);
					this.dispatchEvent("connected");
				},{once:true});
				id = setInterval(()=>{
					this.#dispatchEvent(this.events.signal.regist,{
						window: window
					},top);
				},500);
			});
		}else{
			this.addEventListener("allLoad",e=>{
				this.#addEventListener(this.events.signal.regist,()=>{
					this.#addEventListener(this.events.signal.dispatch);
					this.#dispatchEvent(this.events.signal.regist,{
						window: window
					},this.frame);
					this.dispatchEvent("connected");
				});
			});
		}
	}
	static #query(detail,options){
		const base = options?.pair == true ? 
			detail.window ? this.frame : this.frame.document : 
			detail.window ? window : document;
		if(!detail.window){
			let ret;
			if(detail.query instanceof Array){
				let i = 0;
				do{
					ret = base.querySelector(detail.query[i]);
				}while(!ret && i < detail.query.length)
			}else{
				ret = base.querySelector(detail.query);
			}
			return ret;
		}else{
			return base;
		}
	}
	static #addEventListener(detail,callback,options,dom){
		options = options ? options : detail.options;
		if(!dom)
			dom = this.#query(detail,options);
		if(dom){
			const f = detail.func ? e=>{detail.func(e,callback)} : callback;
			dom.addEventListener(detail.type, f, options);
			return f;
		}else{
			return false;
		}
	}
	static #removeEventListener(detail,callback,dom){
		if(!dom)
			dom = this.#query(detail);
		if(dom){
			dom.removeEventListener(detail.type, callback);
			return true;
		}else{
			return false;
		}
	}
	static #dispatchEvent(detail,options,dom){
		if(!dom)
			dom = this.#query(detail);
		if(dom){
			if(options){
				dom.dispatchEvent(new CustomEvent(detail.type,{detail: options}));
			}else{
				dom.dispatchEvent(new Event(detail.type));
			}
			return true;
		}else{
			return false;
		}
	}
	/**
	 * 設定済みイベントを登録する
	 * @param {string} type イベントタイプ
	 * @param {function|null} callback コールバック関数
	 * @param {object} options イベントオプション
	 * @returns 登録されたかどうか
	 */
	static addEventListener(type,callback,options){
		if(!callback){
			callback = ()=>{};
		}
		const cb = e=>{
			callback(e);
		}
		if(Object.keys(this.events.once).indexOf(type) >= 0){
			const detail = this.events.once[type];
			if(detail instanceof Event){
				cb(detail);
				return true;
			}else{
				return this.#addEventListener(detail,cb,options);
			}
		}else if(Object.keys(this.events.youtube).indexOf(type) >= 0){
			const detail = this.events.youtube[type];
			return this.#addEventListener(detail,cb,options);
		}else if(type == "storage"){
			chrome.storage.onChanged.addListener(cb);
		}
	}
	/**
	 * 登録されたイベントを削除する
	 * イベントリスナーでは関数を書き換えているので返された関数を使用する必要がある
	 * @param {string} type イベントタイプ
	 * @param {function} callback イベントリスナーから返された関数
	 * @returns 削除できたかどうか
	 */
	static removeEventListener(type,callback){
		if(Object.keys(this.events.once).indexOf(type) >= 0){
			const detail = this.events.once[type];
			if(!(detail instanceof Event)){
				return this.#removeEventListener(detail,callback);
			}
		}else if(Object.keys(this.events.youtube).indexOf(type) >= 0){
			const detail = this.events.youtube[type];
			return this.#removeEventListener(detail,callback);
		}
		return false;
	}
	/**
	 * 設定済みイベントをdispatchする
	 * typeにdispatch,options.typeにイベントタイプを指定するとペアのフレームにdispatchする
	 * @param {string} type イベントタイプ
	 * @param {object} options カスタムイベント送信用
	 * @returns dispatchしたかどうか(onceは実行済みの場合dispatchされない)
	 */
	static dispatchEvent(type,options){
		if(Object.keys(this.events.once).indexOf(type) >= 0){
			const detail = this.events.once[type];
			if(detail instanceof Event){
				return false;
			}else{
				return this.#dispatchEvent(detail,options);
			}
		}else if(Object.keys(this.events.youtube).indexOf(type) >= 0){
			const detail = this.events.youtube[type];
			return this.#dispatchEvent(detail,options);
		}else if(type == "dispatch"){
			const detail = this.events.signal.dispatch;
			return this.#dispatchEvent(detail,options,this.frame);
		}
		return false;
	}
}
YoutubeEvent.init();

class Ext {
	static styleNum = 1;
	static tagAddedDOM(dom){
		dom.setAttribute("data-ext-yc",this.name);
	}
	static setStyle(css){
		const style = document.createElement("style");
		this.tagAddedDOM(style);
		style.setAttribute("data-style-id",this.styleNum);
		style.innerHTML = css;
		document.head.appendChild(style);
		return this.styleNum++;
	}
	static removeStyle(id){
		const styles = document.querySelectorAll('style[data-ext-yc="'+this.name+'"]'+(id?'[data-style-id="'+id+'"]':''));
		styles.forEach(e=>e.remove());
	}
	static removeAddedDOM(){
		const dom = document.querySelectorAll(`[data-ext-yc="${this.name}"]`);
		dom.forEach(e=>e.remove());
	}
}