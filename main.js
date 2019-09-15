let superagent = require('superagent');
let cheerio = require('cheerio');
let mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/data', {
    useNewUrlParser: true
})

let Schema = mongoose.Schema;
let Movie = new Schema({
    name: {
        type: String,
        required: true
    },
    rate: {
        type: Number,
        required: true
    },
    coutury: {
        type: String,
        required: true
    },
    year: {
        type: String,
        required: true
    },
    comments: {
        type: Number,
        required: true
    }
})

let moviedata = mongoose.model('Movie', Movie);
let count = 0;

main(count);

async function main(count) {
    let url = await GetMovieUrls(count);
    console.log('爬取成功第' + count + '页码');
    let result = await GetData(url);
    if (result == undefined) {
        count++;
        main(count);
        return;
    }
};

async function GetMovieUrls(count) {
    console.log(count);
    let x = new Promise(function (reslove, reject) {
        setTimeout(function () {
            let url = [];
            superagent.get('https://movie.douban.com/j/new_search_subjects?tags=%E7%94%B5%E5%BD%B1&start=' + 20 * count + '&year_range=2009,2010').end((err, data) => {
                if (err) {
                    console.log('获取第' + count + '大页失败');
                }
                let Text = data.text;
                let Data = JSON.parse(Text).data;
                if (Data != '') {
                    for (let i in Data) {
                        url.push(Data[i].url);
                    }
                }
                reslove(url);
            })
        }, 500)
    })
    return x;
}

async function GetData(url) {
    return new Promise((reslove, reject) => {
        let index = 0;
        let i = 1;
        let timer = setInterval(() => {
            if (url[index] == undefined) {
                clearInterval(timer);
                reslove(undefined);
            } else {
                superagent.get(url[index++]).end((err, data) => {
                    if (err) {
                        console.log('页面' + (i++) + '不存在');
                    } else {
                        let $ = cheerio.load(data.text);
                        let Yeardata = $('#content h1 span').last().text().split('');
                        let Year = Yeardata[1] + Yeardata[2] + Yeardata[3] + Yeardata[4];
                        //匹配国家de正则表达式
                        let reg = /制片国家\/地区:\s([A-z\u4e00-\u9fa5]+(\s\/\s[A-z\u4e00-\u9fa5]+)*)/m;
                        let country = reg.exec($('#info').text());
                        if (country == null) {
                            coutury = ['', ''];
                        }
                        let temp = {
                            name: $('#content h1 span').first().text(),
                            rate: $('.ll.rating_num').text(),
                            country: country[1],
                            year: parseInt(Year),
                            comments: $('.rating_people span').text()
                        }
                        //判断是否为空，为空调出
                        let boolean = true;
                        for (let attr in temp) {
                            if (temp[attr] == '') {
                                boolea = false;
                            }
                        }

                        if (boolean == false) {
                            console.log("第" + (i++) + '条数据存在空值，不存入数据库');
                        } else {
                            //查询重复
                            moviedata.find(temp, (err, ret) => {
                                if (err) {
                                    console.log('查询' + (i++) + '数据失败,故不存入数据库');
                                }
                                //如果不重复才存入
                                if (ret == '') {
                                    let item = new moviedata(temp);
                                    //存入数据
                                    item.save((err, ret) => {
                                        if (err) {
                                            console.log('第' + (i++) + '数据不存在,但调用save存入失败,可能因为存在空值');

                                        } else {
                                            console.log('成功存入第' + (i++) + '条数据');
                                        }
                                    })
                                } else {
                                    console.log('第' + (i++) + '数据已存在');
                                }
                            })
                        }
                    }
                })
            }
        }, 1000)
    })
}