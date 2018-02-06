import axios from 'axios';
import { $ } from './bling';

function ajaxHeart(ev) {
  ev.preventDefault();
  axios
    .post(this.action)
    .then((res) => {
      // this.heart will look for any elements in the form with a name attribute of heart
      const isHearted = this.heart.classList.toggle('heart__button--hearted');
      $('.heart-count').textContent = res.data.hearts.length;
      if (isHearted) {
        this.heart.classList.add('heart__button--float');
        setTimeout(() => this.heart.classList.remove('heart__button--float'), 2500);
      }
    })
    .catch(console.error);
}

export default ajaxHeart;
