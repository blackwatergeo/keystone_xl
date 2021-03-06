///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 - 2016 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////

define([
    'jimu/BaseWidget',
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/_base/html',
    'dojo/dom',
    'dojo/on',
    'dojo/query',
    'dijit/registry',
    './LayerListView',
    './NlsStrings',
    'jimu/LayerInfos/LayerInfos',
    'dojo/dom-class',
    'dojo/dom-style'
  ],
  function(BaseWidget, declare, lang, array, html, dom, on,
  query, registry, LayerListView, NlsStrings, LayerInfos, domClass, domStyle) {

    var clazz = declare([BaseWidget], {
      //these two properties is defined in the BaseWiget
      baseClass: 'jimu-widget-layerList',
      name: 'layerList',
      _denyLayerInfosReorderResponseOneTime: null,
      _denyLayerInfosIsVisibleChangedResponseOneTime: null,
      //layerListView: Object{}
      //  A module is responsible for show layers list
      layerListView: null,

      //operLayerInfos: Object{}
      //  operational layer infos
      operLayerInfos: null,

      startup: function() {
        this.inherited(arguments);
        NlsStrings.value = this.nls;
        this._denyLayerInfosReorderResponseOneTime = false;
        this._denyLayerInfosIsVisibleChangedResponseOneTime = false;
        // summary:
        //    this function will be called when widget is started.
        // description:
        //    according to webmap or basemap to create LayerInfos instance
        //    and initialize operLayerInfos;
        //    show layers list;
        //    bind events for layerLis;

        if (this.map.itemId) {
          LayerInfos.getInstance(this.map, this.map.itemInfo)
            .then(lang.hitch(this, function(operLayerInfos) {
              this.operLayerInfos = operLayerInfos;
              this.showLayers();
              this.bindEvents();
              dom.setSelectable(this.layersSection, false);
            }));
        } else {
          var itemInfo = this._obtainMapLayers();
          LayerInfos.getInstance(this.map, itemInfo)
            .then(lang.hitch(this, function(operLayerInfos) {
              this.operLayerInfos = operLayerInfos;
              this.showLayers();
              this.bindEvents();
              dom.setSelectable(this.layersSection, false);
            }));
        }
      },

      destroy: function() {
        this._clearLayers();
        this.inherited(arguments);
      },

      _obtainMapLayers: function() {
        // summary:
        //    obtain basemap layers and operational layers if the map is not webmap.
        var basemapLayers = [],
          operLayers = [];
        // emulate a webmapItemInfo.
        var retObj = {
          itemData: {
            baseMap: {
              baseMapLayers: []
            },
            operationalLayers: []
          }
        };
        array.forEach(this.map.graphicsLayerIds, function(layerId) {
          var layer = this.map.getLayer(layerId);
          if (layer.isOperationalLayer) {
            operLayers.push({
              layerObject: layer,
              title: layer.label || layer.title || layer.name || layer.id || " ",
              id: layer.id || " "
            });
          }
        }, this);
        array.forEach(this.map.layerIds, function(layerId) {
          var layer = this.map.getLayer(layerId);
          if (layer.isOperationalLayer) {
            operLayers.push({
              layerObject: layer,
              title: layer.label || layer.title || layer.name || layer.id || " ",
              id: layer.id || " "
            });
          } else {
            basemapLayers.push({
              layerObject: layer,
              id: layer.id || " "
            });
          }
        }, this);

        retObj.itemData.baseMap.baseMapLayers = basemapLayers;
        retObj.itemData.operationalLayers = operLayers;
        return retObj;
      },

      showLayers: function() {
        // summary:
        //    create a LayerListView module used to draw layers list in browser.
        this.layerListView = new LayerListView({
          operLayerInfos: this.operLayerInfos,
          layerListWidget: this,
          config: this.config
        }).placeAt(this.layerListBody);
      },

      _clearLayers: function() {
        // summary:
        //   clear layer list
        //domConstruct.empty(this.layerListTable);
        if (this.layerListView && this.layerListView.destroyRecursive) {
          this.layerListView.destroyRecursive();
        }
      },

      _refresh: function() {
        this._clearLayers();
        this.showLayers();
      },

      /****************
       * Event
       ***************/
      bindEvents: function() {
        // summary:
        //    bind events are listened by this module
        this.own(on(this.operLayerInfos,
          'layerInfosChanged',
          lang.hitch(this, this._onLayerInfosChanged)));

        this.own(on(this.operLayerInfos,
          'tableInfosChanged',
          lang.hitch(this, this._onTableInfosChanged)));

        this.own(this.operLayerInfos.on('layerInfosIsVisibleChanged',
          lang.hitch(this, this._onLayerInfosIsVisibleChanged)));

        this.own(on(this.operLayerInfos,
          'updated',
          lang.hitch(this, this._onLayerInfosObjUpdated)));

        this.own(on(this.operLayerInfos,
          'layerInfosReorder',
          lang.hitch(this, this._onLayerInfosReorder)));

        this.own(on(this.map,
          'zoom-end',
          lang.hitch(this, this._onZoomEnd)));

        this.own(on(this.operLayerInfos,
          'layerInfosRendererChanged',
          lang.hitch(this, this._onLayerInfosRendererChanged)));

        this.own(on(this.operLayerInfos,
          'layerInfosOpacityChanged',
          lang.hitch(this, this._onLayerInfosOpacityChanged)));
		  
		//exp add
        this.own(on(this.filterTextBox, 'keydown', lang.hitch(this, function(evt){
            if (this.filterTextBox.value.length > -1)
            {
              this.filterTextBox.style.color = "#000000";
            }
            else
            {
              this.filterTextBox.style.color = "#d9dde0";
            }
            
            if (evt.keyCode === 13)
            {
              this._onFilterClicked2();
            }
        })));
        //exp end   
      },
	  
	  //exp add
	  _resetFilter: function(){
            
            this.filterTextBox.value = "";
            this.filterTextBox.style.color = "#d9dde0";
			this.expFoundLayerMsg.style.display = "none";
            var rowLayers = query(".jimu-widget-row.layer-row");
            var titleLayers = query(".div-content.jimu-float-leading");
            for (var x = 0; x < rowLayers.length; x++) 
            {
                domStyle.set(titleLayers[x],"background-color","");
                var parentClass = rowLayers[x].parentNode.getAttribute("class");
                if (parentClass === "layers-list-body")
                {
                    rowLayers[x].style.display = '';
                    
                }
            };
   
        },      

        _onFilterClicked2: function (){

            var searchLength = this.filterTextBox.value.length;
            var searchValue = this.filterTextBox.value.toString().toLowerCase();
            var stringFound = false;
            var findCount = 0;
            var rowNodes = query(".jimu-widget-row.layer-row");
            for (var x = 0; x < rowNodes.length; x++) {
            
                var rowTitleNode = query(".div-content.jimu-float-leading", rowNodes[x])[0];
                domStyle.set(rowTitleNode, "background-color", "");
                
                if (searchLength > 2 && rowTitleNode.innerHTML.toString().toLowerCase().indexOf(searchValue) !== -1) {
                    
					stringFound = true;
					findCount = findCount + 1;
                    var rowID = rowNodes[x].getAttribute("layerTrNodeID");
                    
                    domStyle.set(rowTitleNode, "background-color", "yellow");

                    try {
                    
                        var parentGroupID = rowNodes[x].parentNode.parentNode.parentNode.getAttribute("layerContentTrNodeId");

						if (parentGroupID !== null)
						{
							rowNodes[x].parentNode.style.display = "table";
                        };
					
					
                        do {
                            
                            var parentGroupInfo = document.querySelectorAll("[layerTrNodeID='" + parentGroupID + "']")[0];
                            var pgiParentClass = parentGroupInfo.parentNode.getAttribute("class");
                            if (pgiParentClass !== "layers-list-body"){
                                parentGroupInfo.parentNode.style.display = "table";
                            };
                            
                            var parentGroupImg = query(".showLegend-div", parentGroupInfo)[0];
                            domClass.add(parentGroupImg, 'unfold');
                            
                            parentGroupID = parentGroupInfo.parentNode.parentNode.parentNode.getAttribute("layerContentTrNodeId");
                            
                        }
                        while (parentGroupID !== null);
                        
                    } 
                    catch (err) {
                        console.log(err);
                        continue;
                    }
                };
            };
            
			if (searchLength < 3)
            {
                this.expFoundLayerMsg.innerHTML = "Minimum 3 characters to search";
                this.expFoundLayerMsg.style.display = "";
                return;
            };
            
            if (stringFound === false) {
                this.expFoundLayerMsg.innerHTML = "No layers match search string";
                this.expFoundLayerMsg.style.display = "";
            }
            else
            {
                this.expFoundLayerMsg.innerHTML = "Found " + findCount.toString() + " Layer(s). Zoom in if layer name is dim.";
                this.expFoundLayerMsg.style.display = "";
            };
        },
		//exp end

      _onLayerInfosChanged: function(layerInfo, changedType) {
        //this._refresh();

        if(changedType === "added") {
          var allLayers = this.map.layerIds.concat(this.map.graphicsLayerIds);

          var layerIndex = array.indexOf(allLayers, layerInfo.id);
          var refLayerId = null;
          var refLayerNode = null;
          for(var i = layerIndex - 1; i >= 0; i--) {
            refLayerId = allLayers[i];
            refLayerNode = query("[class~='layer-tr-node-" + refLayerId + "']", this.domNode)[0];
            if(refLayerNode) {
              break;
            }
          }
          if(refLayerNode) {
            this.layerListView.drawListNode(layerInfo, 0, refLayerNode, 'before');
          } else {
            this.layerListView.drawListNode(layerInfo, 0, this.layerListView.layerListTable);
          }
        } else {
          this.layerListView.destroyLayerTrNode(layerInfo);
        }
      },

      _onTableInfosChanged: function(tableInfoArray, changedType) {
        if(changedType === "added") {
          array.forEach(tableInfoArray, function(tableInfo) {
            this.layerListView.drawListNode(tableInfo, 0, this.layerListView.tableListTable);
          }, this);
        } else {
          array.forEach(tableInfoArray, function(tableInfo) {
            this.layerListView.destroyLayerTrNode(tableInfo);
          }, this);
        }
      },

      _onLayerInfosIsVisibleChanged: function(changedLayerInfos) {
        if(this._denyLayerInfosIsVisibleChangedResponseOneTime) {
          this._denyLayerInfosIsVisibleChangedResponseOneTime = false;
        } else {
          array.forEach(changedLayerInfos, function(layerInfo) {
            query("[class~='visible-checkbox-" + layerInfo.id + "']", this.domNode)
            .forEach(function(visibleCheckBoxDomNode) {
              var visibleCheckBox = registry.byNode(visibleCheckBoxDomNode);
              if(layerInfo.isVisible()) {
                visibleCheckBox.check();
              } else {
                visibleCheckBox.uncheck();
              }
            }, this);

          }, this);
        }
      },

      _onLayerInfosObjUpdated: function() {
        this._refresh();
      },

      _onZoomEnd: function() {
        this.operLayerInfos.traversal(lang.hitch(this, function(layerInfo) {
          query("[class~='layer-title-div-" + layerInfo.id + "']", this.domNode)
          .forEach(function(layerTitleDivIdDomNode) {
            try {
              if (layerInfo.isInScale()) {
                html.removeClass(layerTitleDivIdDomNode, 'grayed-title');
              } else {
                html.addClass(layerTitleDivIdDomNode, 'grayed-title');
              }
            } catch (err) {
              console.warn(err.message);
            }
          }, this);
        }));
      },

      _onLayerInfosReorder: function() {
        if(this._denyLayerInfosReorderResponseOneTime) {
          // denies one time
          this._denyLayerInfosReorderResponseOneTime = false;
        } else {
          this._refresh();
        }
      },

      _onLayerInfosRendererChanged: function(changedLayerInfos) {
        try {
          array.forEach(changedLayerInfos, function(layerInfo) {
            this.layerListView.redrawLegends(layerInfo);
          }, this);
        } catch (err) {
          this._refresh();
        }
      },

      _onLayerInfosOpacityChanged: function(changedLayerInfos) {
        array.forEach(changedLayerInfos, function(layerInfo) {
          var opacity = layerInfo.layerObject.opacity === undefined ? 1 : layerInfo.layerObject.opacity;
          var contentDomNode = query("[layercontenttrnodeid='" + layerInfo.id + "']", this.domNode)[0];
          query(".legends-div.jimu-legends-div-flag img", contentDomNode).style("opacity", opacity);
        }, this);
      },

      onAppConfigChanged: function(appConfig, reason, changedData){
        /*jshint unused: false*/
        this.appConfig = appConfig;
      }

    });

    return clazz;
  });
