const util = require('util');
const jsdom = require("jsdom");
const { url } = require('inspector');
const { JSDOM } = jsdom;
const exec = util.promisify(require('child_process').exec);



async function getIndexPage() {
    try {
        const { stdout, stderr } = await exec(`curl --show-error --silent --cookie-jar ./cookiejar.txt 'https://www.hays.de/jobsuche/stellenangebote-jobs/j/Contracting/3/p/1?q=&e=false'`)
        if (stderr) throw new Error(stderr)

        if (stdout) {
            return stdout
        } else {
            throw new Error('getIndexPage returns empty!' + stdout)
        }


    }
    catch (err) {
        console.error('Error in curl')
        throw err;
    }


}

async function getUrls(page) {

    const dom = new JSDOM(page);

    let projectLinks = []
    const amountOfElements = dom.window.document.getElementsByClassName("search__result__header__a").length

    for (let index = 0; index < amountOfElements; index++) {

        let projectLink = dom.window.document.getElementsByClassName("search__result__header__a")[index].href
        projectLinks.push(projectLink)

    }

    return projectLinks

}



async function getPageDetails(pageUrl) {

    try {
        const { stdout, stderr } = await exec(`curl --show-error --silent --cookie-jar ./cookiejar.txt 'https://www.hays.de/jobsuche/stellenangebote-jobs-detail-systems-and-support-engineer-opentext-attendorn-681288/1'`)
        if (stderr) throw new Error(stderr)

        if (stdout) {
            return stdout
        } else {
            throw new Error('getPageDetails returns empty!' + stdout)
        }

    }
    catch (err) {
        console.error('Error in curl')
        throw err;
    }
}

async function processPageDetails(html) {

    const dom = new JSDOM(html);


    let projectUrl = dom.window.document.head.getElementsByTagName('meta')['jobfriendly_param_available'].getAttribute('content');

    let title = dom.window.document.getElementsByClassName("hays__job__details__job__title")[0].textContent


    let location = dom.window.document.getElementsByClassName("hays__job__details__job__location")[0].textContent

    let metaHeaderLength = dom.window.document.getElementsByClassName("row hays__job__details__job__meta__item").length

    let projectNumber, startDate, projectDuration

    for (let index = 0; index < metaHeaderLength; index++) {
        const element = dom.window.document.getElementsByClassName("row hays__job__details__job__meta__item")[index]

        if (element.children[0].textContent.indexOf("Referenznummer") != -1) {
            let projectNumberTemp = element.children[1].textContent
            let filtered = projectNumberTemp.replace(/\n/, '');
            projectNumber = filtered.trim()
        }

        if (element.children[0].textContent.indexOf("Startdatum") != -1) {
            let startDateTemp = element.children[1].textContent
            let filtered = startDateTemp.replace(/\n/, '');
            startDate = filtered.trim()

        }

        if (element.children[0].textContent.indexOf("Projektdauer") != -1) {
            let projectDurationTemp = element.children[1].textContent
            let filtered = projectDurationTemp.replace(/\n/, '');
            projectDuration = filtered.trim()
        }

    }

    let jobTasks, myQualifications, myBenefits

    let accordionHeader = dom.window.document.getElementsByClassName("hays__job__detail__accordion__header")
    for (let index = 0; index < accordionHeader.length; index++) {
        const element = accordionHeader[index];

        if (element.textContent.indexOf("Meine Aufgaben") != -1) {

            let jobTasksTemp = []
            let allChildren = element.nextElementSibling.children[0].children
            for (let index = 0; index < allChildren.length; index++) {
                const element = allChildren[index];
                jobTasksTemp.push(element.textContent.trim())
            }
            jobTasks = jobTasksTemp
        }

        if (element.textContent.indexOf("Meine Qualifikationen") != -1) {

            let myQualificationsTemp = []
            let allChildren = element.nextElementSibling.children[0].children
            for (let index = 0; index < allChildren.length; index++) {
                const element = allChildren[index];
                myQualificationsTemp.push(element.textContent.trim())
            };
            myQualifications = myQualificationsTemp
        }

        if (element.textContent.indexOf("Meine Vorteile") != -1) {

            let myBenefitsTemp = []
            let allChildren = element.nextElementSibling.children[0].children
            for (let index = 0; index < allChildren.length; index++) {
                const element = allChildren[index];
                myBenefitsTemp.push(element.textContent.trim())
            };
            myBenefits = myBenefitsTemp
        }

    }


    let contactPerson
    let contactNode = dom.window.document.getElementsByClassName("hays__job__details__your-contact-at-hays__item")
    for (let index = 0; index < contactNode.length; index++) {
        const element = contactNode[index];
        if (element.children[0].textContent.indexOf("Mein Ansprechpartner") != -1) {
            let contactPersonTemp = element.lastElementChild.nextSibling.textContent
            let filtered = contactPersonTemp.replace(/\n/, '');
            contactPerson = filtered.trim()
        }
    };

    let contactArray = dom.window.document.getElementsByClassName("hays__job__details__your-contact-at-hays--desktop")[0].children
    for (let index = 0; index < contactArray.length; index++) {
        const element = contactArray[index];


        if (element.href) {
            if (element.href.indexOf("callto") != -1) {
                var phoneNumber = element.textContent
            }
            if (element.href.indexOf("mailto") != -1) {
                var contactEmail = element.textContent
            }
        }

    }

    let jobSpecialism = dom.window.document.getElementById("job_specialism").value
    let jobIndustry = dom.window.document.getElementById("job_industry").value


    let seenDate = new Date();

    let result = {
        projectUrl: "https://www.hays.de" + projectUrl,
        title: title,
        projectNumber: projectNumber,
        startDate: startDate,
        projectDuration: projectDuration,
        jobTasks: jobTasks,
        myQualifications: myQualifications,
        myBenefits: myBenefits,
        jobSpecialism: jobSpecialism,
        jobIndustry: jobIndustry,
        contactPerson: contactPerson,
        contactEmail: contactEmail,
        phoneNumber: phoneNumber,
        company: "Hays",
        seenDate: seenDate,
    }

    console.log(JSON.stringify(result, null, 4))
    return result

}


async function writeJsonToFile(json) {
    const fs = require('fs');

    let filename = json.projectNumber.slice(0, -2)



    fs.writeFile("./savedProjects/" + filename + ".json", JSON.stringify(json), err => {
        if (err) {
            throw err
        }
    })

}
async function start() {

    //  let page = await getIndexPage();
    //  let projectLinkArray = await getUrls(page);
    //  console.log(projectLinkArray)
    const pageDetailsHtml = await getPageDetails()
    const pageDetailsJsonExtract = await processPageDetails(pageDetailsHtml)
    writeJsonToFile(pageDetailsJsonExtract)
    // console.log(pageDetailsJsonExtract)


}

start()
