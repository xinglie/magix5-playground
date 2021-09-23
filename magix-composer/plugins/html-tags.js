
/*
    浏览器原生标签，用来识别html字符串中用户自定义标签
    https://www.html-5-tutorial.com/all-html-tags.htm
    https://developer.mozilla.org/en-US/docs/Web/SVG/Element
    https://en.wikipedia.org/wiki/HTML_element
    https://developer.mozilla.org/en-US/docs/Web/MathML/Element
*/
let createMap = str => {
    let tags = str.split(',');
    let o = {};
    for (let tag of tags) {
        o[tag] = 1;
    }
    return o;
};
let selfCloseTags = createMap('area,base,basefont,br,col,embed,frame,hr,img,input,isindex,keygen,link,meta,param,source,track,wbr');

let nativeTags = createMap('a,abbr,applet,address,area,article,aside,audio,b,base,bgsound,bdi,bdo,blockquote,body,br,button,canvas,caption,cite,code,col,colgroup,data,datalist,dd,del,details,dfn,dialog,div,dl,dt,dir,em,embed,fieldset,figcaption,figure,footer,form,h1,h2,h3,h4,h5,h6,head,header,hgroup,hr,html,i,iframe,frame,frameset,img,input,ins,kbd,keygen,label,legend,li,link,main,map,mark,menu,menuitem,meta,meter,nav,nobr,noembed,noframes,spacer,strike,xmp,noscript,object,ol,optgroup,option,output,p,param,pre,progress,q,rb,rp,rt,rtc,ruby,s,samp,script,section,select,small,source,span,strong,style,sub,summary,sup,table,tbody,td,template,textarea,tfoot,th,thead,time,title,tr,track,u,ul,var,video,wbr,slot,marquee');

let svgUpperTags = createMap('altGlyph,altGlyphDef,altGlyphItem,animateColor,animateMotion,animateTransform,clipPath,feBlend,feColorMatrix,feComponentTransfer,feComposite,feConvolveMatrix,feDiffuseLighting,feDisplacementMap,feDistantLight,feDropShadow,feFlood,feFuncA,feFuncB,feFuncG,feFuncR,feGaussianBlur,feImage,feMerge,feMergeNode,feMorphology,feOffset,fePointLight,feSpecularLighting,feSpotLight,feTile,feTurbulence,foreignObject,glyphRef,linearGradient,radialGradient,textPath');

let svgTags = createMap('svg,a,altglyph,altglyphdef,altglyphitem,animate,animatecolor,animatemotion,animatetransform,circle,clippath,color-profile,cursor,defs,desc,discard,ellipse,feblend,fecolormatrix,fecomponenttransfer,fecomposite,feconvolvematrix,fediffuselighting,fedisplacementmap,fedistantlight,fedropshadow,feflood,fefunca,fefuncb,fefuncg,fefuncr,fegaussianblur,feimage,femerge,femergenode,femorphology,feoffset,fepointlight,fespecularlighting,fespotlight,fetile,feturbulence,filter,font,font-face,font-face-format,font-face-name,font-face-src,font-face-uri,foreignobject,g,glyph,glyphref,hatch,hatchpath,hkern,image,line,lineargradient,marker,mask,mesh,meshgradient,meshpatch,meshrow,metadata,missing-glyph,mpath,path,pattern,polygon,polyline,radialgradient,rect,script,set,solidcolor,stop,style,switch,symbol,text,textpath,title,tref,tspan,unknown,use,view,vkern');

let mathTags = createMap('math,maction,maligngroup,malignmark,menclose,merror,mfenced,mfrac,mglyph,mi,mlabeledtr,mlongdiv,mmultiscripts,mn,mo,mover,mpadded,mphantom,mroot,mrow,ms,mscarries,mscarry,mscarries,msgroup,mstack,mlongdiv,msline,mstack,mspace,msqrt,msrow,mstack,mstack,mstyle,msub,msup,msubsup,mtable,mtd,mtext,mtr,munder,munderover,semantics,annotation,annotation-xml');

module.exports = {
    nativeTags,
    svgTags,
    svgUpperTags,
    mathTags,
    selfCloseTags
};