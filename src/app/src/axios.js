// axios
import axios from 'axios'

// let domain = "http://192.168.43.135:8100/";
let domain = "http://trade9ine.ifelight.com:8100/";
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
