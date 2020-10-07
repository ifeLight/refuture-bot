// axios
import axios from 'axios'

const domain = "http://localhost:8100/";

export default axios.create({
  baseURL: domain
  // You can add your headers here
})
