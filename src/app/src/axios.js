// axios
import axios from 'axios'

let domain = "http://192.168.43.227:8100/";
try {
  const sssss = webpackHotUpdate;
} catch {
  const { host, protocol} = window.location;
  domain = `${protocol}//${host}/`;
}

export default axios.create({
  baseURL: domain
  // You can add your headers here
})
