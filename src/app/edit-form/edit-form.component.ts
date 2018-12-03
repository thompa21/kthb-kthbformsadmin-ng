import { Component, OnInit } from '@angular/core';

import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { BackendService } from '../backend.service';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-edit-form',
  templateUrl: './edit-form.component.html',
  styleUrls: ['./edit-form.component.scss']
})
export class EditFormComponent implements OnInit {

  form: FormGroup;
  formdata:any;
  formdatajson:any;
  isopenurl = false;
  openurlsource;
  openurljson:any;
  objectOpenurl;
  objectFormfields;
  openurlparameters;
  //Variabel för att hålla reda på om formuläret initierats och är redo att visas i template
  init = false;
  openurlboxlabel;
  optionalfieldtext;
  status;
  description;
  isValidFormSubmitted = null;
  showtoperrormessage = false;
  posturl;
  backendresponse = false;
  backendresult;

  constructor(
    public backend:BackendService,
    private http: HttpClient,
    private titleService: Title
  ) {
  }
  
  /**
   * 
   * Hämta rätt formulärdata från JSON beroende på angivet formid i app-root attribute
   */
  async getFormData() {
    this.formdatajson = await this.http.get("https://apps.lib.kth.se/webservices/kthbforms/api/v1/forms/1").toPromise();
    this.formdata = JSON.parse(this.formdatajson.json);
    console.log(this.formdata);
    this.setTitle(this.formdata.header.swedish);
    this.optionalfieldtext = this.formdata.optionalfieldtext;
    this.openurlboxlabel = this.formdata.openurlboxlabel;
    this.openurlparameters = this.formdata.openurlparameters;
    this.posturl = this.formdata.posturl;
    this.status = this.formdata.status;
    this.description = this.formdata.description;
    //skapa ett object som t ex formulärtemplate kan iterera.
    this.objectFormfields = 
      Object.keys(this.formdata.formfields)
        .map(prop => {
          return Object.assign({}, { key: prop} , this.formdata.formfields[prop]);
        });
        
    const formGroup = {};
    for(let prop of Object.keys(this.formdata.formfields)) {
      formGroup[prop] = new FormControl(this.formdata.formfields[prop].value || '', this.mapValidators(this.formdata.formfields[prop].validation));
    }

    this.form = new FormGroup(formGroup);
    this.init = true;
    
    //Hämta eventuella url-parametrar(exempelvis om någon klickat på länk i Primo, Libris, Lean Library...)
    //Kolla vilka sourceparametrar som finns angivna i "openurlsourceparameters", om någon av dessa finns i url så får det anses vara en openurlrequest
    if(this.formdata.openurlsourceparameters) {
      for(let source of this.formdata.openurlsourceparameters) {
        if(this.getParam(source)!= ""){
          this.isopenurl = true;
          this.openurlsource = this.getParam(source);
          console.log(this.openurlsource);
          break;
        }
      }
    }

    if(this.isopenurl){
      console.log("Formulär som skapats via klick från Primo etc...");
      //Hantera färdigifyllda genom en textruta ovan formuläret där infon fylls i
      //Gör parametrar till payload som kan skickas till backend som body
      this.openurljson = this.openurlparametersToJSON();
      //skapa ett object som t ex formulärtemplate kan iterera.
      this.objectOpenurl = 
      Object.keys(this.openurljson)
        .map(prop => {
          return Object.assign({}, { key: prop} , this.openurljson[prop]);
        });
      //Sätt värdet på genre till värdet från akutell genre-urlparameter  
      //Sätt genre-fält till hidden (men enabled) så att de beroende fälten visas.
      for(let prop of this.objectFormfields) {
        if(prop.key == "genre") {
          this.form.get(prop.key).setValue(decodeURI(this.getParam(this.openurlparameters[0].name[this.openurlsource]))); 
          prop.hidden = true;
        }
      }
    } else {
    };
  }

  ngOnInit() {
    this.getFormData();
  }

  /**
   * 
   * @param name 
   * 
   * hämta eventuella urlparametrar
   */
  getParam(name){
    const results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(window.location.href);
    if(!results){
      return "";
    }
    return results[1] || "";
  }

  openurlparametersToJSON() {	    		
    var pairs = location.search.slice(1).split('&');
    var result = {};
    pairs.forEach(function(pair:any) {
      pair = pair.split('=');
      result[pair[0]] = decodeURIComponent(pair[1] || '').replace(/\+/g, ' ');
    });
    return JSON.parse(JSON.stringify(result));
  }

  /**
   * 
   * @param newTitle 
   * 
   * Sätt title för sidan
   */
  setTitle( newTitle: string) {
    this.titleService.setTitle( newTitle );
  }

  /**
   * 
   * @param validators 
   * 
   * Skapa eventuella valideringar från JSON
   */
  private mapValidators(validators) {
    const formValidators = [];
    if(validators) {
      for(const validation of Object.keys(validators)) {
        if(validation === 'required') {
          if (validators[validation].value) {
            formValidators.push(Validators.required);
          }
        } else if(validation === 'min') {
          formValidators.push(Validators.min(validators[validation].value));
        } else if (validation === 'pattern') {
          formValidators.push(Validators.pattern(validators[validation].value));
        }
      }
    }
    return formValidators;
  }

  /**
   * 
   * @param object 
   * 
   * Se till att en checkbox inte har något värde alls när den inte är checked
   * annars valideras den som giltig.
   */
  checkboxchange(object) {
    if (!this.form.get(object).value){
      this.form.get(object).setValue("");
    }
  }

  /**
   * 
   * @param domobj 
   * 
   * @param object 
   * 
   * Hantera klick på formulärfält och aktivera/inaktivera beroende på inläst JSON
   */
  onchangeformobject(domobj, object){
    if (!this.form.get(object).valid) {
      this.showtoperrormessage = true;
    } else {
      this.showtoperrormessage = false;
    }

    //kolla igenom alla fält(som hämtats via JSON) och sätt enable = true/false beroende på aktuella värden
    var validfield;
    var show;
    var optionvalidchoice;
    var enableoption;
    for(let prop of this.objectFormfields) {
      show = false;
      //om fältet har kriterier för att visas
      if (prop.showcriteria) {
        //hämta kriterier
        for(let index1 of Object.keys(prop.showcriteria)){
          //för varje, kolla om kriterie är uppfyllt
          validfield = false;
          for(let index2 of Object.keys(prop.showcriteria[index1].values)){
            if (this.form.get(prop.showcriteria[index1].field).value == prop.showcriteria[index1].values[index2] || prop.showcriteria[index1].values[index2] == "any") {
              validfield = true;
              break;
            } else {
              validfield = false;
            }
          }

          if (validfield){
            show = true;
            //om ett radio/checkbox-fält, kolla också kriterier för varje option
            if(prop.type=="radio") {
              //om options finns
              if(prop.options) {
                for (let index3 of Object.keys(prop.options) ){
                  optionvalidchoice = false                  
                  if (prop.options[index3].showcriteria) {
                    for(let index4 of Object.keys(prop.options[index3].showcriteria)){
                      enableoption = false;
                      for(let index5 of Object.keys(prop.options[index3].showcriteria[index4].values)){
                        if (this.form.get(prop.options[index3].showcriteria[index4].field).value == prop.options[index3].showcriteria[index4].values[index5] || prop.options[index3].showcriteria[index4].values[index5] == "any") {
                          optionvalidchoice = true;
                          break;                       
                        } else {
                          optionvalidchoice = false;
                        }
                      }
                      if (optionvalidchoice){
                        enableoption = true;
                      } else {
                        enableoption = false;
                        break;
                      }
                    }
                    if (enableoption){
                      prop.options[index3].enabled = true;
                    } else {
                      prop.options[index3].enabled = false;
                    }
                  }
                }
              }
            }
          } else {
            show = false;
            break;
          }
        }
        if (show) {
          //gör fältet klickbart
          this.form.get(prop.key).enable();
          //visar fältet
          prop.enabled = true;
        } else {
          // gör fältet låst
          this.form.get(prop.key).disable();
          // döljer fältet
          prop.enabled = false;
        }
        //hantera om formuläret är openurl(visa inte de fält som kommer via openurl)
        if(this.isopenurl && !prop.openurlenabled) {
          //gör fältet låst och dolt
          this.form.get(prop.key).disable();
          prop.enabled = false;
        }
      }
    }
  }

  postformvalues(form) {
    this.backend.postForm(this.posturl, form).subscribe((result) => {
      if(result.status == 201){
        this.backendresponse = true;
        this.backendresult = result;
        window.scrollTo(0,0);
      }
    }, (err) => {
      console.log(err);
    });
  }

  /**
   * 
   * @param form 
   * 
   * Hantera beställningen
   * 
   * Skicka via http post
   */
  onSubmit(form) {
    this.isValidFormSubmitted = false;
     if (this.form.invalid) {
        return;
     }
     this.isValidFormSubmitted = true;

     if(this.form.valid) {
      // skapa ett sammanslaget objekt av form och openurljson
      var newjson = {
        "form" : {},
        "openurl": {}
      };
      newjson.form=form;
      newjson.openurl = this.openurljson;
      console.log(JSON.stringify(newjson));
      this.postformvalues(newjson);
  }
  }
}

