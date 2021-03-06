/* Formulario para el despliegue de un mapa con opelayers centrado en la ciudad de Bogotá */
Ocs.View.FormMap = Ocs.View.BaseMap.extend({
    my_initialize: function() {
        this.model.on('change:geometry', this.set_geometry, this);
        navigator.geolocation.getCurrentPosition( _.bind(this.set_geolocation, this) );
    },
    controls: function() {
        return [
        new OpenLayers.Control.Navigation(),
                                        new OpenLayers.Control.PanZoomBar(),
                                        new OpenLayers.Control.ScaleLine(),
                                        new OpenLayers.Control.LayerSwitcher(),
                                        new Ocs.OpenLayers.Control.SinglePointEditingToolbar(this.model.get('markers'))
        ];
    },
    set_geometry: function(model){
        var geoJSON = new OpenLayers.Format.GeoJSON();
        $('#geo_point').attr('value',geoJSON.write(model.get('geometry')));
    },
    set_geolocation: function(position) {
        var lonLat = new OpenLayers.LonLat(position.coords.longitude, position.coords.latitude);
        lonLat = lonLat.transform(
            new OpenLayers.Projection("EPSG:4326"), //transform from WGS 1984
                                this.map.getProjectionObject() //to Spherical Mercator Projection
        );
        var layer = this.model.get("markers");
        var point = new OpenLayers.Geometry.Point(lonLat.lon, lonLat.lat);
        var feature = new OpenLayers.Feature.Vector(point,{icon: "http://www.openlayers.org/dev/img/marker.png"} );
        layer.addFeatures(feature);
        this.map.setCenter(lonLat, 18);// Zoom level
        return point;
    }
});

/* Mapa que despliega el listado de PQRs registradas */
Ocs.View.ListMap = Ocs.View.BaseMap.extend({
    my_initialize: function() {
        this.report_list_view = new Ocs.View.ReportList({
            el: $('#report_list')
        });
        this.report_list_view.on('display_layer', this.display_layer, this);
        this.report_list_view.render();
        var style = new OpenLayers.Style({
            pointRadius: "${radius}",
            fillColor: "#00FF00",
            fillOpacity: 0.8,
            strokeColor: "#001100",
            strokeWidth: 2,
            strokeOpacity: 0.8
        }, {
            context: {
                radius: function(feature) {
                    var pix = 2;
                    if(feature.cluster)
                        pix = Math.min(feature.attributes.count, 7) + 2;
                    return pix;
                }
            }
        });
        var style_map = new OpenLayers.StyleMap({
            "default": style,
            "select": {
                fillColor: "#8aeeef",
                strokeColor: "#32a8a9"
            }
        });

        var list_layer = this.model.get('list_layer');
        list_layer.styleMap = style_map;
        list_layer.redraw();
        list_layer.setVisibility(false);

        select_control = new OpenLayers.Control.SelectFeature( list_layer, {
            onSelect: _.bind(this.on_feature_select, this),
                                                            onUnselect: _.bind(this.on_feature_unselect, this)
        });
        this.model.map.addControl(select_control);
        select_control.activate();
    },
    controls: function() {
        return [
        new OpenLayers.Control.Navigation(),
                                        new OpenLayers.Control.PanZoomBar(),
                                        new OpenLayers.Control.ScaleLine(),
                                        new OpenLayers.Control.LayerSwitcher(),
        ];
    },
    on_feature_select: function (feature) {
        this.report_list_view.add_feature(feature);
    },
    on_feature_unselect: function (feature) {
        this.report_list_view.remove_feature(feature);
        this.display_layer();
    },
    display_layer: function() {
        var layer = this.model.get('list_layer');
        layer.setVisibility(true);
        var feature = new OpenLayers.Feature.Vector();
        feature.cluster = [];
        _.each(layer.features, function(i) {
            feature.cluster.push(i.cluster[0]);
        });
        this.report_list_view.add_feature(feature, true);
    }
});

/* Despliega la información alfa numérica del listado de PQRS registradas */
Ocs.View.ReportList = Backbone.View.extend(
_.extend({}, Mixins.SubviewCollection, {
    events: {
        "click #consultar" : "display_layer",
    },
    initialize: function() {
        this.template = _.template($('#list-template').html());
        this.subview_tmpl = _.template($('#item-template').html());
    },
    display_layer: function(e) {
        this.trigger('display_layer');
        e.preventDefault();
    },
    create_subview_instance: function(model) {
        var view = new Ocs.View.ReportListItem({
            model: model, parent_view: this,
            template: this.subview_tmpl
        });
        return view;
    },
    add_feature: function(feature, all) {
        this.render();
        this.remove_all_subviews();
        $('.pagination').remove();
        if(all) {
            $(this.el).append('<h2>Reportes</h2>');
        }
        else {
            $(this.el).append('<h2>Reportes seleccionados</h2>');
        }
        _.each(feature.cluster, function(feature) {
            var model = new Ocs.Model.Report({ feature: feature });
            var view = this.add_subview(model);
        }, this); //Add a subview per feature in the cluster
        $(this.el).jPaginate({
            items: 5,
            next: ">>",
            previous: "<<",
            cookies: false,
            position: 'both'
        });
    },
    remove_feature: function(feature) {
        //_.each(feature.cluster, this.remove_subview, this); //remove a subview per feature in the cluster
        this.remove_all_subviews();
        this.render();
    },
    render: function() {
        $('.pagination').remove();
        $(this.el).html(this.template());
    }
}));

/* Item del listado alfanumerico de PQRS */
Ocs.View.ReportListItem = Backbone.View.extend({
    className: 'media',
    initialize: function() {
        this.template = this.options.template;
    },
    render: function() {
        $(this.el).html(this.template(this.model.toJSON()));
        return this;
    }
});

/****************************************
* Wizard
*/
Ocs.Wizard = {};
Ocs.Wizard.Wizard = WizardView.extend({
    events: {
        "click #next_step_button" : "goNextStep",
        "click #prev_step_button" : "goPrevStep"
    },
    initializeModel: function() {
        this.model = new WizardModel({
            steps: new WizardStepCollection([
            {
                step_number :       1,
                title :             "Infraestructura",
                instructions :      "Por favor seleccione que tipo de infraestructura presenta el daño",
                view :              new Ocs.Wizard.Elemento.Step({ el: $($("#wizard_elemento").html()) })
            },
            {
                step_number :       2,
                title :             "Tipo de daño",
                instructions :      "Por favor seleccione el tipo de daño que desea reportar",
                view :              new Ocs.Wizard.Tipo.Step({ el: $($("#wizard_tipo").html()) })
            },
            {
                step_number :       3,
                title :             "Descripción",
                instructions :      "Por favor ingrese mayores detalles acerca del tipo de daño que desea reportar",
                view :              new Ocs.Wizard.Descripcion.Step({ el: $($("#wizard_descripcion").html()) })
            },
            {
                step_number :       4,
                title :             "Ubicación",
                instructions :      "Por favor ingrese la ubicación ",
                view :              new Ocs.Wizard.Ubicacion.Step({ el: $($("#wizard_ubicacion").html()) })
            },
            {
                step_number :       5,
                title :             "Datos de contacto",
                instructions :      "Por favor ingrese los datos de contacto",
                view :              new Ocs.Wizard.Contacto.Step({ el: $($("#wizard_contacto").html()) })
            },
            {
                step_number :       6,
                title :             "Confirmar",
                instructions :      "Al enviar los datos usted acepta los términos y condiciones del sitio",
                view :              new Ocs.Wizard.Enviar.Step({ el: $($("#wizard_enviar").html()) })
            },
            ]),
        });
        this.model.save = function() { this.trigger('save') };
        this.model.on('save',this.finish, this);
    },
    finish: function() {
        $('#wizard_loader',this.el).show();
        $('#prev_step_button',this.el).attr('disabled','disabled');
        $('#next_step_button',this.el).attr('disabled','disabled');
        $('#claim_form').submit();
        return false;
    },
});

/****************************************
 * Elemnto de infraestructura
 */
Ocs.Wizard.Elemento = {};
Ocs.Wizard.Elemento.Step = Backbone.View.extend({
    events: {
        "click .btn.tipo_elemento": "select_type"
    },
    initialize: function() {
        var claim_type = $('#damage_element_by_citizen',this.el).val();
        if(claim_type) {
            var btn = $('.btn.tipo_elemento[value='+claim_type+']', this.el);
            this.select_type_button(btn);
        }
    },
    validate: function() {
        if($('#damage_element_by_citizen').val()) {
            return true;
        }
        return 'Por favor seleccione un tipo de daño antes de continuar';
    },
    select_type_button: function(button){
        $('#step_error').html('');
        $('.btn.tipo_elemento', this.el).each(function (i, v) {
            $(v).removeClass('btn-success');
            $(v).html('Seleccionar');
        });
        $('#damage_element_by_citizen').val(button.attr('value'));
        button.addClass('btn-success');
        button.html('Seleccionado');
        return false;
    },
    select_type: function(e){
        var button = $(e.currentTarget);
        this.select_type_button(button);
        return false;
    },
});

/****************************************
* Tipo de Daño
*/
Ocs.Wizard.Tipo = {};
Ocs.Wizard.Tipo.Step = Backbone.View.extend({
    events: {
        "click .btn.damage_type": "select_type"
    },
    initialize: function() {
        var claim_type = $('#damage_type_by_citizen',this.el).val();
        if(claim_type) {
            var btn = $('.btn.damage_type[value='+claim_type+']', this.el);
            this.select_type_button(btn);
        }
    },
    validate: function() {
        if($('#damage_type_by_citizen').val()) {
            return true;
        }
        return 'Por favor seleccione un tipo de daño antes de continuar';
    },
    select_type_button: function(button){
        $('#step_error').html('');
        $('.btn.damage_type', this.el).each(function (i, v) {
            $(v).removeClass('btn-success');
        $(v).html('Seleccionar');
        });
        $('#damage_type_by_citizen').val(button.attr('value'));
        button.addClass('btn-success');
        button.html('Seleccionado');
        return false;
    },
    select_type: function(e){
        var button = $(e.currentTarget);
        this.select_type_button(button);
        return false;
    },
    render: function() {
        var type = $('#damage_element_by_citizen').val();
        $('.thumbnails', this.el).hide();
        var damage_type_el = $('.element_type_'+type, this.el);
        damage_type_el.show();

        return this;
    }
});
/****************************************
* Descripción
*/
Ocs.Wizard.Descripcion = {};
Ocs.Wizard.Descripcion.Step = Backbone.View.extend({
    initialize: function() {
    },
    validate: function() {
        if(!$('#description').val()) {
            return 'Por favor ingrese una descripción';
        }
        if(!$('#image').val()) {
            return 'Por favor adjunte una fotografía del daño';
        }
        return true;
    },
    render: function() {
        var type = $('#damage_type_by_citizen').val();

        //defaults
        length_options = width_options = {
            'ns-nr': '- Seleccionar -',
            '10-30cm': 'Entre 10 y 30 centimetros',
            '30-50cm': 'Entre 30 y 50 centimetros',
            '50-100cm': 'Entre 50 centimetros y un metro',
            '+1m': 'Más de un metro'
        };

        deep_options = {
            'ns-nr': '- Seleccionar -',
            '30-50cm': 'Entre 30 y 50 centimetros',
            '50-100cm': 'Entre 50 centimetros y un metro',
            '+1m': 'Más de un metro'
        }

        var damage_dimension_el = $('.damage_dimension');

        if (type == 'anden-accesibilidad' || type == 'cicloruta-segnal' || type == 'puente-peatonal-accesibilidad') {
            damage_dimension_el.hide();
            return this;
        }
        damage_dimension_el.show();

        var deep_el = $('#damage_deep_by_citizen-label,#damage_deep_by_citizen-element');
        deep_el.show();
        if(type == 'via-fisura' || type == 'puente-peatonal-grieta') {
            deep_el.hide();
            width_options = {
                'ns-nr': '- Seleccionar -',
                '1-5cm': 'Entre 1 y 5 centimetros',
                '6-10cm': 'Entre 6 y 10 centimetros'
            };
        }
        else if(type == 'via-hueco' || type == 'cicloruta-hueco' || type == 'anden-hueco') {
            deep_options = {
                'ns-nr': '- Seleccionar -',
                '5-10cm': 'Entre 5 y 10 centimetros',
                '10-30cm': 'Entre 10 y 30 centimetros',
            }
        }
        else if (type == 'puente-peatonal-laminas' || type == 'cicloruta-obstruccion' || type == 'anden-desnivel') {
            deep_el.hide();
        }

        create_options = function(value, key) {
            html_options += '<option value="' + key + '">' + value + '</a>';
        };

        //width
        var html_options = '';
        _.each(width_options, create_options);
        $('#damage_width_by_citizen').html(html_options);

        //length
        html_options = '';
        _.each(length_options, create_options);
        $('#damage_legth_by_citizen').html(html_options);

        //deep
        html_options = '';
        _.each(deep_options, create_options);
        $('#damage_deep_by_citizen').html(html_options);

        return this;
    },
});
/****************************************
* Ubicación
*/
Ocs.Wizard.Ubicacion = {};
Ocs.Wizard.Ubicacion.Step = Backbone.View.extend({
    events: {
        "click #geocode_btn" : "geocode",
        "keypress #claim_address":  "geocode_on_enter",
    },
    initialize: function() {
        var styleMap = new OpenLayers.StyleMap({
            'default': {
                pointRadius: 10,
                fillOpacity: 1,
                externalGraphic: 'http://www.openlayers.org/dev/img/marker.png'
            },
            'temporary': {
                fillOpacity: 0.5,
                pointRadius: 10,
                externalGraphic: 'http://www.openlayers.org/dev/img/marker.png'
            }
        });
        window.main = new Ocs.View.FormMap({ //FIXME: shouldn't use window.main
        model: new Ocs.Model.Map({
            markers: new OpenLayers.Layer.Vector("Markers", {styleMap: styleMap}),
        }),
        el: $('#map_element', this.el),
                                                    initial_zoom: 15
        });
    },
    validate: function() {
        if(!$('#geo_point').val()) {
            return 'Por favor marque un punto en el mapa o ubique el daño a través de una dirección';
        }
        return true;
    },
    render: function() {
        $(this.el).show();
        window.main.render();
        return this;
    },
    geocode: function() {
        var address = $('#claim_address',this.el).val();
        $.get('geocode', {address: address}, function(data) {
            if(!_.isEmpty(data)) {
                window.main.model.get("markers").removeAllFeatures();
                var point = window.main.set_geolocation(data.position);
                window.main.model.set('geometry',point);
                $('#step_error').html('');
            }
            else {
                msg = 'La dirección no pudo ser ubicada geograficamente';
                var msg = '<div class="alert alert-error"><button type="button" class="close" data-dismiss="alert">&times;</button>' + msg + '</div>'
                $('#step_error').html(msg);
            }
        }, 'json');
    },
    geocode_on_enter: function(e) {
        this.input = $('#claim_address');
        var text = this.input.val();
        if (!text || e.keyCode != 13) return;
        this.geocode();
    }
});
/****************************************
    * Contacto
    */
Ocs.Wizard.Contacto = {};
Ocs.Wizard.Contacto.Step = Backbone.View.extend({
    initialize: function() {
    },
    validate: function() {
        if(!$('#name').val()) {
            return 'Por favor ingrese su nombre';
        }
        if($('#name').val() && !$('#lastname').val()) {
            return 'Por favor ingrese sus apellidos';
        }
        if($('#lastname').val() && !$('#name').val()) {
            return 'Por favor ingrese su primer y segundo nombre';
        }
        if(!$('#lastname').val() && !$('#name').val()) {
            return 'Por favor ingrese su primer y segundo nombre';
        }
        if($('#document_number').val() && (!$('#name').val() || !$('#lastname').val())) {
            return 'Por favor ingrese sus nombres y apellidos';
        }
        if(!$('#document_number').val() && $('#name').val()  ) {
            return 'Por favor ingrese un número de documento de identidad';
        }
        if($('#document_number').val() && $('#document_number').val().length < 6 ) {
            return 'Por favor verifique su número de identificación';
        }
        if($('#name').val() && (!$('#email').val() && !$('#twitter').val() && !$('#facebook').val() && !$('#phone').val())) {
            return 'Por favor ingrese al menos un dato de contacto';
        }
        return true;
    },
});
/****************************************
* Enviar
*/
Ocs.Wizard.Enviar = {};
Ocs.Wizard.Enviar.Step = Backbone.View.extend({
    initialize: function() {
        $('#recaptcha_widget_div').appendTo($(this.el)) //Move the recaptcha autogenerated div to the wizard step
    },
    validate: function() {
        return true;
    },
});
