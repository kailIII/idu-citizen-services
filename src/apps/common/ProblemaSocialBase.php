<?php
class ProblemaSocialBaseForm extends BaseForm {
	public $object = null;
	protected $form_name = 'problema_social';
	protected $description_fieldmap = array('descripcion');
	protected $forward_fieldmap = array();
	protected $add_submit_button_on_captcha = true;

	public function init() {
		$config = new Zend_Config_Yaml( __DIR__.'/problema_social_form.yml',$this->form_name);
		$this->setConfig($config);
		$this->setAttrib('enctype', 'multipart/form-data');
		$publickey = glue("config")->read('recaptcha_pubkey');
		$privatekey = glue("config")->read('recaptcha_privkey');
		if(!empty($publickey)) {
			$recaptcha = new Zend_Service_ReCaptcha($publickey, $privatekey);
			$captcha = new Zend_Form_Element_Captcha('captcha',
					array(
							'captcha'       => 'ReCaptcha',
							'captchaOptions' => array('captcha' => 'ReCaptcha', 'service' => $recaptcha)
					)
			);
			$this->addElement($captcha);
			$send_group = $this->getDisplayGroup('send');
			if($send_group) {
				$send_group->clearElements();
				$send_group->addElement($captcha);
				if($this->add_submit_button_on_captcha) {
					$send_group->addElement($this->getElement('submit'));
				}
			}
			else {
				$captcha->setOrder(99);
				if($this->add_submit_button_on_captcha) {
					$this->getElement('submit')->setOrder(100);
				}
			}
		}
	}

	protected function retrieveCategoryOptions(){
		$c = $this->getOpenErpConnection();
		$oerp = new OpenErpOcsCategory($c);
		$items = $oerp->fetch(array(array('active','=',True)));
		$options = array();
		foreach($items as $obj) {
			$atts = $obj->attributes;
			$options[$atts['id']] = $atts['nombres'];
		}
		return $options;
	}

	protected function retrieveClassificationOptions(){
		$items = $this->retrieveClassificationObjects();
		$options = array();
		foreach($items as $obj) {
			$atts = $obj->attributes;
			$options[$atts['id']] = $atts['nombres'];
		}
		return $options;
	}

	protected function retrieveClassificationObjects($in_array = false) {
		$c = $this->getOpenErpConnection();
		$oerp = new OpenErpOcsClassification($c);
		$objects = $oerp->fetch(array(array('is_portal_visible','=',True)));
		if(!$in_array) return $objects;
		$data = array();
		foreach($objects as $obj) {
			$data[$obj->id] = $obj->attributes;
		}
		return $data;
	}

	public function buildObject(){
		$c = $this->getOpenErpConnection();
		$values = $this->getValues();
		$pqr = new myOpenErpPqr($c);
		$attributes = array();
		if( !empty($values['nombres']) && !empty($values['apellidos']) ) {
			$citizen = array(
					'nombres' => $values['nombres'],
					'apellidos' => $values['apellidos']
			);
			if(!empty($values['document_number'])) {
				$citizen['tipo_documento'] = $values['tipo_documento'];
				$citizen['documento'] = $values['documento'];
			}
			$contact_map = array('email','celular','direccion','telefono_fijo');
			foreach($contact_map as $f) {
				if( !empty($values[$f]) ) {
					$citizen[$f] = $values[$f];
				}
			}
			$attributes['partner_address_id'] = $citizen;
		}

		$attributes['orfeo_id'] = 0;
		$attributes['priority'] = 'l';
		$attributes['state'] = 'draft';
		$attributes['description'] = '';
		foreach($this->description_fieldmap as $f) {
			if(!empty($values[$f])) {
				$attributes['description'] .= "\n\n--------- $f ---------\n".$values[$f];
			}
		}
		foreach($this->forward_fieldmap as $f) {
			if(!empty($values[$f])) {
				$attributes[$f] = $values[$f];
			}
		}

		if(!empty($values['email'])) $attributes['email_from'] = $values['email'];
		if(!empty($values['telefono_fijo'])) $attributes['celular'] = $values['telefono_fijo'];

		$attributes['ack_message_subject'] = '[IDU-PQR #{0}] Su requerimiento ha sido recibido';
		$attributes['ack_message_body'] = "Su requerimiento ha sido registrado en nuestro Sistema de Gestión de PQRS con el radicado No {0}\n\nNuestra Oficina de Atención al Ciudadano procederá a atender su solicitud para darle respuesta tan pronto como sea posible.\n\nMuchas gracias por comunicarse con nosotros.\n\n------ Su Requerimiento ------\n{1}\n";
		$pqr->attributes = $attributes;
		$this->object = $pqr;
		return $pqr;
	}
}