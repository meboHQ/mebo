const Mebo = require('../../../src');


class VectorUploadAction extends Mebo.Action{
  constructor(){
    super();
    this.createInput('a: text');
    this.createInput('file: filePath[]', {allowedExtensions: ['bin']});
  }

  async _perform(data){
    const checksum = this.createAction('file.checksum');

    const result = {};
    result[this.input('a').name()] = data.a;

    for (let i=0; i < data.file.length; i++){
      checksum.input('file').setValue(data.file[i]);
      // eslint-disable-next-line no-await-in-loop
      result[this.input('file').basename(i)] = await checksum.run();
    }

    return result;
  }

  async _after(err, value){
    // deleting files
    const deleteActionPromises = [];

    for (const fileName of this.input('file').value()){
      const deleteAction = this.createAction('file.delete');
      deleteAction.input('file').setValue(fileName);
      deleteActionPromises.push(deleteAction.run());
    }

    await Promise.all(deleteActionPromises);
  }
}

module.exports = VectorUploadAction;
