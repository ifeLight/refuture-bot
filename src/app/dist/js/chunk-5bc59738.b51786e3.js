(window["webpackJsonp"]=window["webpackJsonp"]||[]).push([["chunk-5bc59738"],{"5a0c":function(t,e,n){!function(e,n){t.exports=n()}(0,(function(){"use strict";var t="millisecond",e="second",n="minute",s="hour",r="day",i="week",a="month",o="quarter",u="year",c="date",h=/^(\d{4})[-/]?(\d{1,2})?[-/]?(\d{0,2})[^0-9]*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?.?(\d+)?$/,d=/\[([^\]]+)]|Y{2,4}|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a|A|m{1,2}|s{1,2}|Z{1,2}|SSS/g,f={name:"en",weekdays:"Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),months:"January_February_March_April_May_June_July_August_September_October_November_December".split("_")},l=function(t,e,n){var s=String(t);return!s||s.length>=e?t:""+Array(e+1-s.length).join(n)+t},v={s:l,z:function(t){var e=-t.utcOffset(),n=Math.abs(e),s=Math.floor(n/60),r=n%60;return(e<=0?"+":"-")+l(s,2,"0")+":"+l(r,2,"0")},m:function t(e,n){if(e.date()<n.date())return-t(n,e);var s=12*(n.year()-e.year())+(n.month()-e.month()),r=e.clone().add(s,a),i=n-r<0,o=e.clone().add(s+(i?-1:1),a);return+(-(s+(n-r)/(i?r-o:o-r))||0)},a:function(t){return t<0?Math.ceil(t)||0:Math.floor(t)},p:function(h){return{M:a,y:u,w:i,d:r,D:c,h:s,m:n,s:e,ms:t,Q:o}[h]||String(h||"").toLowerCase().replace(/s$/,"")},u:function(t){return void 0===t}},$="en",g={};g[$]=f;var m=function(t){return t instanceof M},p=function(t,e,n){var s;if(!t)return $;if("string"==typeof t)g[t]&&(s=t),e&&(g[t]=e,s=t);else{var r=t.name;g[r]=t,s=r}return!n&&s&&($=s),s||!n&&$},D=function(t,e){if(m(t))return t.clone();var n="object"==typeof e?e:{};return n.date=t,n.args=arguments,new M(n)},y=v;y.l=p,y.i=m,y.w=function(t,e){return D(t,{locale:e.$L,utc:e.$u,x:e.$x,$offset:e.$offset})};var M=function(){function f(t){this.$L=this.$L||p(t.locale,null,!0),this.parse(t)}var l=f.prototype;return l.parse=function(t){this.$d=function(t){var e=t.date,n=t.utc;if(null===e)return new Date(NaN);if(y.u(e))return new Date;if(e instanceof Date)return new Date(e);if("string"==typeof e&&!/Z$/i.test(e)){var s=e.match(h);if(s){var r=s[2]-1||0,i=(s[7]||"0").substring(0,3);return n?new Date(Date.UTC(s[1],r,s[3]||1,s[4]||0,s[5]||0,s[6]||0,i)):new Date(s[1],r,s[3]||1,s[4]||0,s[5]||0,s[6]||0,i)}}return new Date(e)}(t),this.$x=t.x||{},this.init()},l.init=function(){var t=this.$d;this.$y=t.getFullYear(),this.$M=t.getMonth(),this.$D=t.getDate(),this.$W=t.getDay(),this.$H=t.getHours(),this.$m=t.getMinutes(),this.$s=t.getSeconds(),this.$ms=t.getMilliseconds()},l.$utils=function(){return y},l.isValid=function(){return!("Invalid Date"===this.$d.toString())},l.isSame=function(t,e){var n=D(t);return this.startOf(e)<=n&&n<=this.endOf(e)},l.isAfter=function(t,e){return D(t)<this.startOf(e)},l.isBefore=function(t,e){return this.endOf(e)<D(t)},l.$g=function(t,e,n){return y.u(t)?this[e]:this.set(n,t)},l.unix=function(){return Math.floor(this.valueOf()/1e3)},l.valueOf=function(){return this.$d.getTime()},l.startOf=function(t,o){var h=this,d=!!y.u(o)||o,f=y.p(t),l=function(t,e){var n=y.w(h.$u?Date.UTC(h.$y,e,t):new Date(h.$y,e,t),h);return d?n:n.endOf(r)},v=function(t,e){return y.w(h.toDate()[t].apply(h.toDate("s"),(d?[0,0,0,0]:[23,59,59,999]).slice(e)),h)},$=this.$W,g=this.$M,m=this.$D,p="set"+(this.$u?"UTC":"");switch(f){case u:return d?l(1,0):l(31,11);case a:return d?l(1,g):l(0,g+1);case i:var D=this.$locale().weekStart||0,M=($<D?$+7:$)-D;return l(d?m-M:m+(6-M),g);case r:case c:return v(p+"Hours",0);case s:return v(p+"Minutes",1);case n:return v(p+"Seconds",2);case e:return v(p+"Milliseconds",3);default:return this.clone()}},l.endOf=function(t){return this.startOf(t,!1)},l.$set=function(i,o){var h,d=y.p(i),f="set"+(this.$u?"UTC":""),l=(h={},h[r]=f+"Date",h[c]=f+"Date",h[a]=f+"Month",h[u]=f+"FullYear",h[s]=f+"Hours",h[n]=f+"Minutes",h[e]=f+"Seconds",h[t]=f+"Milliseconds",h)[d],v=d===r?this.$D+(o-this.$W):o;if(d===a||d===u){var $=this.clone().set(c,1);$.$d[l](v),$.init(),this.$d=$.set(c,Math.min(this.$D,$.daysInMonth())).$d}else l&&this.$d[l](v);return this.init(),this},l.set=function(t,e){return this.clone().$set(t,e)},l.get=function(t){return this[y.p(t)]()},l.add=function(t,o){var c,h=this;t=Number(t);var d=y.p(o),f=function(e){var n=D(h);return y.w(n.date(n.date()+Math.round(e*t)),h)};if(d===a)return this.set(a,this.$M+t);if(d===u)return this.set(u,this.$y+t);if(d===r)return f(1);if(d===i)return f(7);var l=(c={},c[n]=6e4,c[s]=36e5,c[e]=1e3,c)[d]||1,v=this.$d.getTime()+t*l;return y.w(v,this)},l.subtract=function(t,e){return this.add(-1*t,e)},l.format=function(t){var e=this;if(!this.isValid())return"Invalid Date";var n=t||"YYYY-MM-DDTHH:mm:ssZ",s=y.z(this),r=this.$locale(),i=this.$H,a=this.$m,o=this.$M,u=r.weekdays,c=r.months,h=function(t,s,r,i){return t&&(t[s]||t(e,n))||r[s].substr(0,i)},f=function(t){return y.s(i%12||12,t,"0")},l=r.meridiem||function(t,e,n){var s=t<12?"AM":"PM";return n?s.toLowerCase():s},v={YY:String(this.$y).slice(-2),YYYY:this.$y,M:o+1,MM:y.s(o+1,2,"0"),MMM:h(r.monthsShort,o,c,3),MMMM:h(c,o),D:this.$D,DD:y.s(this.$D,2,"0"),d:String(this.$W),dd:h(r.weekdaysMin,this.$W,u,2),ddd:h(r.weekdaysShort,this.$W,u,3),dddd:u[this.$W],H:String(i),HH:y.s(i,2,"0"),h:f(1),hh:f(2),a:l(i,a,!0),A:l(i,a,!1),m:String(a),mm:y.s(a,2,"0"),s:String(this.$s),ss:y.s(this.$s,2,"0"),SSS:y.s(this.$ms,3,"0"),Z:s};return n.replace(d,(function(t,e){return e||v[t]||s.replace(":","")}))},l.utcOffset=function(){return 15*-Math.round(this.$d.getTimezoneOffset()/15)},l.diff=function(t,c,h){var d,f=y.p(c),l=D(t),v=6e4*(l.utcOffset()-this.utcOffset()),$=this-l,g=y.m(this,l);return g=(d={},d[u]=g/12,d[a]=g,d[o]=g/3,d[i]=($-v)/6048e5,d[r]=($-v)/864e5,d[s]=$/36e5,d[n]=$/6e4,d[e]=$/1e3,d)[f]||$,h?g:y.a(g)},l.daysInMonth=function(){return this.endOf(a).$D},l.$locale=function(){return g[this.$L]},l.locale=function(t,e){if(!t)return this.$L;var n=this.clone(),s=p(t,e,!0);return s&&(n.$L=s),n},l.clone=function(){return y.w(this.$d,this)},l.toDate=function(){return new Date(this.valueOf())},l.toJSON=function(){return this.isValid()?this.toISOString():null},l.toISOString=function(){return this.$d.toISOString()},l.toString=function(){return this.$d.toUTCString()},f}(),_=M.prototype;return D.prototype=_,[["$ms",t],["$s",e],["$m",n],["$H",s],["$W",r],["$M",a],["$y",u],["$D",c]].forEach((function(t){_[t[1]]=function(e){return this.$g(e,t[0],t[1])}})),D.extend=function(t,e){return t(e,M,D),D},D.locale=p,D.isDayjs=m,D.unix=function(t){return D(1e3*t)},D.en=g[$],D.Ls=g,D}))},"830e":function(t,e,n){"use strict";n.r(e);var s=function(){var t=this,e=t.$createElement,n=t._self._c||e;return n("div",[n("vx-card",{attrs:{title:"Backtest List",id:"backtest-list-container"}},[n("p",[t._v("View the List of backtest Completed")]),n("br"),n("vs-table",{attrs:{data:t.backtests},on:{selected:t.handleSelected},scopedSlots:t._u([{key:"default",fn:function(e){var s=e.data;return t._l(s,(function(e,r){return n("vs-tr",{key:r,attrs:{data:e,state:e.roi>50?"success":e.roi<-50?"danger":""},on:{click:function(e){return t.alert("sss")}}},[n("vs-td",{attrs:{data:s[r].symbol}},[t._v("\n            "+t._s(s[r].symbol)+"\n          ")]),n("vs-td",{attrs:{data:s[r].exchange}},[t._v("\n            "+t._s(s[r].exchange)+"\n          ")]),n("vs-td",{attrs:{data:s[r].roi}},[t._v("\n            "+t._s(s[r].roi)+"\n          ")]),n("vs-td",{attrs:{data:s[r]._id}},[t._v("\n            "+t._s(s[r].startDate)+"\n          ")]),n("vs-td",{attrs:{data:s[r]._id}},[t._v("\n            "+t._s(s[r].endDate)+"\n          ")]),n("vs-td",{attrs:{data:s[r].leverage}},[t._v("\n            "+t._s(s[r].leverage)+"\n          ")])],1)}))}}]),model:{value:t.selected,callback:function(e){t.selected=e},expression:"selected"}},[n("template",{slot:"thead"},[n("vs-th",[t._v("Symbol")]),n("vs-th",[t._v("Exchange")]),n("vs-th",[t._v("RoI (%)")]),n("vs-th",[t._v("Start Date")]),n("vs-th",[t._v("End Date")]),n("vs-th",[t._v("Leverage")])],1)],2)],1),n("br"),n("vx-card",[n("vs-pagination",{attrs:{totalPages:t.totalPages,total:t.totalPages},model:{value:t.currentPage,callback:function(e){t.currentPage=e},expression:"currentPage"}})],1)],1)},r=[],i=(n("ac6a"),n("5a0c")),a=n.n(i),o={data:function(){return{backtests:[],totalPages:1,total:1,currentPage:1,selected:[]}},methods:{handleSelected:function(t){var e=t._id;this.$router.push("/backtest/".concat(e))},openBacktestListLoading:function(){this.$vs.loading()},closeBacktestListLoading:function(){this.$vs.loading.close()},fetchBacktest:function(){var t=this,e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:1,n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:30;this.openBacktestListLoading();var s=this;this.$http.get("/api/backtest?page=".concat(e,"&limit=").concat(n)).then((function(e){s.closeBacktestListLoading();var n=e.data,r=n.docs,i=n.totalPages;n.page,n.hasNextPage,n.hasPrevPage,n.totalDocs;t.totalPages=i,t.backtests=[],r.forEach((function(e){var n=e.exchange,s=e.roi,r=e.startDate,i=e.endDate;e.exchange=n.toUpperCase(),e.roi=s?parseFloat(s).toFixed(2):"",e.startDate=r?a()(new Date(r)).format("DD-MM-YYYY/HH:mm:ss"):"",e.endDate=i?a()(new Date(i)).format("DD-MM-YYYY/HH:mm:ss"):"",t.backtests.push(e)}))})).catch((function(e){s.closeBacktestListLoading(),t.notifyError(e.message)}))},notifyError:function(t){this.$vs.notify({icon:"error",title:"Error",color:"danger",text:t})}},watch:{currentPage:function(t,e){e!=t&&this.fetchBacktest(parseInt(t))}},mounted:function(){this.fetchBacktest()}},u=o,c=n("2877"),h=Object(c["a"])(u,s,r,!1,null,null,null);e["default"]=h.exports}}]);
//# sourceMappingURL=chunk-5bc59738.b51786e3.js.map