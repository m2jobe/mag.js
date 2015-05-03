;
(function(mag, configs, document, undefined) {

  "use strict";

  var ELEMENT_NODE = 1,
    cached = [],
    MAGNUM = '__magnum__',
    FUNCTION = 'function',
    UNDEFINED = 'undefined',
    MAGNUM_KEY = '_key'

    // helper method to detect arrays -- silly javascript
    function _isArray(obj) {
      return Object.prototype.toString.call(obj) === '[object Array]'
    }

    // TODO: all of these mutations to the element shoudl be there own map
    // i.e. element.__magnum__ = {}
    // TODO: optimize cache results or attach them to the node for reuse
    // use fastdom



    function getPathTo(element) {
      if (element.id !== '')
        return 'id("' + element.id + '")';
      if (element === document.body)
        return element.tagName;

      var ix = 0;
      if (!element.parentNode) return
      var siblings = element.parentNode.childNodes;
      for (var i = 0; i < siblings.length; i++) {
        var sibling = siblings[i];
        if (sibling === element)
          return getPathTo(element.parentNode) + '/' + element.tagName + '[' + (ix + 1) + ']';
        if (sibling.nodeType === 1 && sibling.tagName === element.tagName)
          ix++;
      }
    }

    function removeNode(node) {
      // console.log('read inside removeNode')
      var p = getPathTo(node)
      // remove cache of all children too

      node.parentNode.removeChild(node)
      // call config unload if any ?

      //console.log(p, cached[p])
      if (cached[p + '-config'] && cached[p + '-config'].configContext && typeof cached[p + '-config'].configContext.onunload === FUNCTION) {
        // what arg to send ?
        cached[p + '-config'].configContext.onunload(cached[p + '-config'].configContext, node, p)
      }
    }

    // TODO: get index from getPathTo function
    function getPathIndex(p) {

      var s = p && parseInt(p.split('[').pop().slice(0, -1))

      if (!s) return 0
      return parseInt(s) - 1
    }

    // function removeCache(p) {
    //   // search cache for children

    //   delete cached[p]

    //   // remove cached config too?

    //   for (var k in cached) {
    //     if (k.indexOf(p) === 0) delete cached[k]
    //   }
    //   // remove cache
    //   //console.log('removed',p)
    // }

  var templates = {},
    gkeys = {}, // What about nested Lists, which guid?
    firstRun = false;

  // this is the entry point for this module, to fill the dom with data
  function fill(nodeList, data, key) {
    var node, parent, dataIsArray



      // there is nothing to do if there is nothing to fill
    if (!nodeList) return

    // remove all child nodes if there is no data
    if (data == null) data = {
      _text: ''
    }

    // CACHE
    // DIFF
    // CHANGE? then modify only the changes
    // KEYS for indentification

    // nodeList updates as the dom changes, so freeze it in an array
    var elements = nodeListToArray(nodeList)

    dataIsArray = _isArray(data)



    // match the number of nodes to the number of data elements
    if (dataIsArray) {
      gkeys[key] = gkeys[key] || 0

      if (templates[key] && elements.length === 0) {
        templates[key].parent.insertAdjacentHTML("beforeend", templates[key].node);
        elements = nodeListToArray(templates[key].parent.children)
        if (typeof data[0] === 'object') {
          // data[0][MAGNUM] = elements[0].__key = 0
        }
      }

      if (elements.length === 0) {
        gkeys[key] = 0
        // should never reach here
        // cannot fill empty nodeList with an array of data
        return
      }
      // clone the first node if more nodes are needed
      parent = elements[0].parentNode

      if (!templates[key]) {
        templates[key] = {
          node: elements[0].cloneNode(true).outerHTML,
          parent: parent
        }
      }

      //Adding
      while (elements.length < data.length) {
        if (templates[key]) {
          parent.insertAdjacentHTML("beforeend", templates[key].node)
          node = parent.lastChild
        } else {
          node = elements[0].cloneNode(true)
        }

        elements.push(node)
        if (parent) parent.appendChild(node)
      }
      // loop thru to make sure no undefined keys



      var ekeys = elements.map(function(i) {
        return i.__key
      })

      var keys = data.map(function(i) {
        return i[MAGNUM_KEY]
      })


      // add keys if equal
      if (elements.length == data.length || keys.indexOf(undefined) !== -1) {
        //console.log('something!') 

        //console.log('here', key, gkeys[key])

        // changes data can cause recursion!

        var data = data.map(function(d, i) {

          if (typeof d === 'object') {
            if (elements[i].__key && typeof d[MAGNUM_KEY] === UNDEFINED) {
              d[MAGNUM_KEY] = elements[i].__key
              return d
            }
            if (typeof d[MAGNUM_KEY] === UNDEFINED) {
              d[MAGNUM_KEY] = MAGNUM + gkeys[key]++
            }
            //console.log(d[MAGNUM_KEY], i)
            elements[i].__key = d[MAGNUM_KEY]
          }

          return d
        })
        //console.log(key, data)
      }
      if (elements.length > data.length) {
        if (data.length === 0 || typeof data[0] !== 'object') {

          while (elements.length > data.length) {
            node = elements.pop()
            parent = node.parentNode
            if (parent) {
              removeNode(node)
            }
          }


        } else {
          // more elements than data
          // remove elements that don't have matching data keys

          var found = []
          // get all data keys
          var m = data.map(function(i) {
            return i[MAGNUM_KEY]
          })
          //console.log('m keys', m)
          var k = elements.map(function(i) {
            return i.__key
          })
          //console.log('e keys', k)

          var elements = elements.filter(function(ele, i) {
            if (m.indexOf(ele.__key) === -1 || found.indexOf(ele.__key) !== -1) {
              found.push(ele.__key)
              removeNode(ele)
              return false
            }
            found.push(ele.__key)
            return true
          })

          /*
          var elements = elements.filter(function(ele, i) {
          // determine which elements are not in the data by their MAGNUM key

            if (typeof ele.__key === 'undefined' && i != 0 && typeof data[i] !== 'undefined' 
            || (data[i] && typeof data[i][MAGNUM] === 'undefined' )) {
              console.log('filter',i)

              ele.__key = i
              data[i][MAGNUM] = i
            }

            var out = data.filter(function(v) {
              return v[MAGNUM] == ele.__key
            });
            console.log(out.length, data[i], ele.__key)

            if ((out.length == 0 && typeof data[i] === 'undefined') 
            || (typeof data[i] === 'undefined' && found.indexOf(ele.__key)!==-1)) {
              removeNode(ele)
              return false
            }
            found.push(ele.__key)
            return true
          })
*/
        }
      }

      // remove the last node until the number of nodes matches the data
      // while (elements.length > data.length) {
      //   node = elements.pop()
      //   parent = node.parentNode
      //   if (parent) {
      //     removeNode(node)
      //   }
      // }

    }

    // now fill each node with the data
    for (var i = 0; i < elements.length; i++) {
      var p = getPathTo(elements[i])
      if (dataIsArray) {
        if (elements[i]) {


          fill(elements[i], data[i])

        }
      } else {
        //TODO: is this a child of an array?
        if (data && typeof data === "object" && Object.keys(data).indexOf(MAGNUM_KEY) !== -1) {
          elements[i][MAGNUM] = elements[i][MAGNUM] || {}
          //console.log(data, i)
          elements[i][MAGNUM].isChildOfArray = true
          elements[i][MAGNUM].dataPass = data
        }
        // else if (elements[i].parentNode && elements[i].parentNode.isChildOfArray) {
        //   elements[i].isChildOfArray = true
        //   elements[i]._dataPass = elements[i].parentNode._dataPass
        // }
        // console.log(findParentChild(elements[i]), data, elements[i].parentNode)
        fillNode(elements[i], data)
      }

    }
    return nodeList
  }

  function findParentChild(node) {
    if (node.parentNode && node.parentNode[MAGNUM] && node.parentNode[MAGNUM].isChildOfArray) {
      return node.parentNode
    } else if (node.parentNode) {
      // continue to walk up parent tree 
      return findParentChild(node.parentNode)
    }
  }

  function fillNode(node, data) {
    var attributes,
      attrValue,
      element,
      elements

      // ignore functions
    if (typeof data === FUNCTION) {
      return
    }


    // if the value is a simple property wrap it in the attributes hash
    if (typeof data !== 'object') return fillNode(node, {
      _text: data
    })

    // find all the attributes
    for (var key in data) {
      var value = data[key]

      // null values are treated like empty strings
      if (value === undefined) {
        value = ''
      } else if (value === null && ['onunload'].indexOf(key) === -1) {
        // TODO: delete case
        // special case delete all children if equal to null type  
        var matches = matchingElements(node, key)
        matches.forEach(function(item) {
          removeNode(item)
        })
      }

      //TODO: prepend attributes ? double underscore ??

      // anything that starts with an underscore is an attribute
      if (key[0] === '_') {
        // store the properties to set them all at once
        // if (typeof value === 'string' || typeof value === 'number') {
        attributes = attributes || {}
        attributes[key.substr(1)] = value;
        // } else {
        //   throw new Error('Expected a string or number for "' + key +
        //                   '", got: "' + JSON.stringify(value) + '"');
        // }
      }
    }

    var p = getPathTo(node)

    // fill in all the attributes
    if (attributes) {

      // if (cached[p] && cached[p] === JSON.stringify(attributes)) {
      //   console.log('isame', p, JSON.stringify(attributes))
      // // return
      // }
      // console.log('called', node, attributes)

      // TODO: pass data to event


      fillAttributes(node, attributes)
      // console.log('ichange', p, JSON.stringify(attributes))
      // cached[p] = JSON.stringify(attributes)
    }

    var index = 0,
      ignorekeys = ['willupdate', 'didupdate', 'didload', 'willload']
      // look for non-attribute keys and recurse into those elements
    for (var key in data) {

      // ignore certain system keys
      if (ignorekeys.indexOf(key) !== -1) continue

      var value = data[key]

      // only attributes start with an underscore
      if (key[0] !== '_') {
        elements = matchingElements(node, key);

        // function 
        if (typeof value === FUNCTION && value.type == 'fun') {
          try {
            value = value()
          } catch (e) {}
        }

        // if is array make sure we load all elements not just the first for existing lists

        if (_isArray(value)) {
          elements = matchingElements(node, '$' + key);
        }

        fill(elements, value, p + '/' + key);

        index++
      }
    }
  }


  // freeze the NodeList into a real Array so it can't update as DOM changes
  function nodeListToArray(nodeList) {
    var temp;

    // wrap single item into an array for iteration
    // NOTE: can't use _isArray here, because it could be a NodeList (array-ish)
    if (nodeList.length == null) {
      nodeList = [nodeList];
    }

    // convert array-like object into a real array
    if (!_isArray(nodeList)) {
      temp = [];
      for (var i = 0; i < nodeList.length; i += 1) {
        // Note: occassionaly jsdom returns undefined elements in the NodeList
        if (nodeList[i]) {
          temp.push(nodeList[i]);
        }
      }
      nodeList = temp;
    }

    return nodeList;
  }

  // fill in the attributes on an element (setting text and html first)
  function fillAttributes(node, attributes) {
    var p = getPathTo(node),
      tagIndex = getPathIndex(p)


      // attach to topId so can be removed later

      node._events = node._events || []

      // set the rest of the attributes
    for (var attrName in attributes) {

      // skip text and html, they've already been set
      if (attrName === 'text' || attrName === 'html') continue

      // events
      if (attrName.indexOf('on') == 0) {

        // REALLY ? only one same event per node?
        if (node._events.indexOf(attrName) !== -1 && !firstRun) {
          // console.log('event exists', firstRun)
          continue
        }
        //TODO: if data parent its index is useful add it?
        // TODO: put all params into a data MAP {} ?
        var eventCall = function(fun, node, tagIndex, e) {
          try {
            var dataParent = findParentChild(node),
              path = dataParent && getPathTo(dataParent),
              parentIndex = getPathIndex(path),
              parent = {
                path: path,
                data: ((dataParent || {})[MAGNUM] || []).dataPass,
                node: dataParent,
                index: parentIndex
              }
            return fun.call(node, e, tagIndex, node, parent)
          } catch (err) {
            throw Error('Mag.JS - event handler error - ' + p + err + err.stack)
          } finally {
            mag.redraw()
          }
        }.bind({}, attributes[attrName], node, tagIndex)

        node[attrName] = eventCall
        //console.log('event exists', firstRun)

        // node.addEventListener(attrName.substr(2), eventCall)
        node._events.push(attrName)

      } else {

        if (attrName == 'config') {
          // have we been here before?
          // does the element already exist in cache
          // useful to know if this is newly added
          var isNew = true

          if (!cached[p + '-config']) {
            cached[p + '-config'] = {}
          } else {
            isNew = false
          }

          var context = cached[p + '-config'].configContext = cached[p + '-config'].configContext || {}


          // console.log(p)
          // bind
          var callback = function(data, args) {
            return function() {
              return data.apply(data, args)
            }
          }

          configs.push(callback(attributes[attrName], [node, isNew, context, tagIndex]))
          continue
        }

        // hookins
        var data = {
          key: attrName,
          value: attributes[attrName],
          node: node
        }
        mag.hook('attributes', attrName, data)
        // change
        if (data.change) {
          attrName = data.key
          attributes[attrName] = data.value
        }

        //if (cache) continue
        if (attributes[attrName] === null) {
          node.removeAttribute(attrName)
        } else {
          node.setAttribute(attrName, attributes[attrName].toString())
        }

      }
    }

    // TODO: fix - this is not very accurate?
    //if (cache) {
    //console.log(node.tagName, attributes)
    //return
    // }
    // set html after setting text because html overrides text
    setText(node, attributes.text)
    setHtml(node, attributes.html)


  }

  function setText(node, text, xpath) {
    var child, children

      // make sure that we have a node and text to insert
    if (!node || text == null) {
      return
    }
    // cache all of the child nodes
    if (!children) {
      children = [];
      for (var i = 0; i < node.childNodes.length; i += 1) {
        child = node.childNodes[i];
        if (child.nodeType === ELEMENT_NODE) {
          children.push(child)
        }
      }
    }

    // remove all of the children
    //WHY?
    while (node.firstChild) {
      node.removeChild(node.firstChild)
    }

    // SELECT|INPUT|TEXTAREA
    // now add the text
    if (node.nodeName.toLowerCase() === 'input') {
      // special case for input elements
      node.setAttribute('value', text.toString());
    } else {
      // create a new text node and stuff in the value
      node.appendChild(node.ownerDocument.createTextNode(text.toString()));
    }

    // reattach all the child nodes
    for (var i = 0; i < children.length; i += 1) {
      node.appendChild(children[i]);
    }
  }

  function addCloneId(html) {
    // change id
    if (html.cloner) {
      // check if already has
      html.id = MAGNUM + html.id.split(MAGNUM).pop()
    }
  }



  function setHtml(node, html) {

    if (!node || html == null) return;

    // remove all children

    // before remove if firstChild has a magnum id we need to save it
    // if(node.firstChild && node.nodeType === 1 && node.id && node.id.indexOf('__magnum__::')!==-1){
    //   console.log('WHOAH!!')
    //   // copy and move
    //   var copy = node.firstChild
    //   var sp1 = document.createElement("span")
    //   // append to whom ?
    //   document.body.appendChild(sp1)

    //   node.replaceChild(copy, sp1);

    // }
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }

    if (typeof html === FUNCTION && html().nodeType === 1) {

      //console.log(node.children.length, node.id, html().id)

      addCloneId(html())

      //var children = html().querySelectorAll(':scope > *')
      //console.log(children)
      //for(var k in children){
      //console.log(k, children[k])
      var sp1 = document.createElement("span")
      node.appendChild(sp1)
      try {
        node.replaceChild(html(), sp1);
      } catch (e) {
        console.log('FILL HTML ERROR', html().id, e)
      }
      //}
    } else if (html.nodeType === 1) {

      addCloneId(html)

      var sp1 = document.createElement("span")
      node.appendChild(sp1)
      node.replaceChild(html, sp1);
    } else {
      node.innerHTML = html;
    }
    // CAN'T do below since it will append on every new call
    // node.insertAdjacentHTML("afterbegin", html)
  };


  //===========================================================================
  // TODO: Decide if the caching of element matching should be reintroduced.
  // The original implementation cached the lookup of elements, but it seems
  // like this will only be useful in cases where the same DOM elements are
  // getting filled mutliple times -- that seems like it would only happen
  // when someone is running performance benchmarks.
  //===========================================================================


  // find all of the matching elements (breadth-first)

  function matchingElements(node, key, nested) {
    var elements = childElements(node)
    var matches = []
    var keyName = key

    // is this cache necessary good useful?
    // are we losing some dynamism?


    var globalSearch = key[0] === '$'

    if (keyName[0] === '$') {
      // bust cache
      keyName = keyName.substr(1)
    }

    // search all child elements for a match
    for (var i = 0; i < elements.length; i += 1) {
      if (elementMatcher(elements[i], keyName)) {
        matches.push(elements[i]);
      }
    }

    // if there is no match, recursively search the childNodes
    if (!matches.length || globalSearch) {
      for (var i = 0; i < elements.length; i++) {
        // NOTE: pass in a flag to prevent recursive calls from logging
        matches = matches.concat(matchingElements(elements[i], key, true))
        if (matches.length && !globalSearch) break
      }
    }

    if (!nested && !matches.length) {
      // TODO: mag.hookin for not found matchers
      //console.log('FILL - Warning: no matches found for "' + key + '"')
      var data = {
        key: key,
        value: matches,
        node: node
      }
      mag.hook('elementMatcher', key, data)
      //hookin change
      if (data.change) {
        //console.log('change to elementMatcher key - ' + key, data)
      }
    }
    return matches

  }


  // return just the child nodes that are elements
  function childElements(node) {
    var children = node.childNodes
    var elements = []

    for (var i = 0; i < children.length; i += 1) {
      if (children[i].nodeType === ELEMENT_NODE) {
        elements.push(children[i])
      }
    }

    return elements
  }

  // match elements on tag, id, name, class name, data-bind, etc.
  function elementMatcher(element, key) {
    var paddedClass = ' ' + element.className + ' ';

    return (
      element.id === key ||
      paddedClass.indexOf(' ' + key + ' ') > -1 ||
      element.name === key ||
      element.nodeName.toLowerCase() === key.toLowerCase() ||
      element.getAttribute('data-bind') === key
    );
  }

  function clear() {
    //console.log('clear called')
    firstRun = true
    //CLEAR CACHE TOO?
    //cached=[]
  }


  function elementToObject(el, o) {

    var o = {
      tagName: el.tagName
    };
    if (el.firstChild || el.children[0]) {
      var item = el.firstChild || el.childNodes[0]
      var val = item.nodeValue || item.value || item.innerText
      if (val) val = val.replace(/\u00a0/g, "x").trim()
      if (val) o.tagValue = val

    }

    var i = 0;
    for (i; i < el.attributes.length; i++) {
      o[el.attributes[i].name] = el.attributes[i].value;
    }

    var children = el.children;
    if (children.length) {


      o.children = [];
      i = 0;
      for (i; i < children.length; i++) {
        var child = children[i];
        o.children[i] = elementToObject(child, o.children);
      }
    }
    return o;
  }


  function unclear() {
    firstRun = false
  }
  // attach fill to current context (in the browser this will be window.fill)
  // this.fill = fill;
  // this.configs = configs

  mag.fill = {
    fill: fill,
    elementToObject: elementToObject,
    cached: cached,
    find: matchingElements,
    clear: clear,
    unclear: unclear,
    configs: configs
  }
  window.mag = mag

}(window.mag || {}, [], document))
