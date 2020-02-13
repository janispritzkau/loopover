module.exports = {
  publicPath: '.',

  pwa: {
    name: process.env.VUE_APP_NAME,
    themeColor: "#47587a",
    appleMobileWebAppCapable: true,
    manifestOptions: {
      background_color: "#ffffff"
    }
  },

  configureWebpack: {
    externals: {
      moment: "moment"
    }
  },

  chainWebpack(config) {
    if (process.env.MODE == "testing") {
      config.plugin("copy").tap(([patterns]) => [["public.testing", ...patterns]])
    }
  },

  productionSourceMap: false
}