import { Request, Response } from 'express'
import { resolve } from 'path'
import { getCustomRepository } from 'typeorm'
import { AppError } from '../errors/AppError'
import { SurveysRepository } from '../repositories/SurveyRepository'
import { SurveysUsersRepository } from '../repositories/SurveysUseresRepository'
import { UsersRepository } from '../repositories/UsersRepository'
import SendMailsService from '../services/SendMailsService'
import SendMailService from '../services/SendMailsService'

class SendMailController {

    async execute( request: Request, response: Response ) {
        const { email, survey_id } = request.body

        const usersRepository = getCustomRepository(UsersRepository)
        const surveysRepository = getCustomRepository(SurveysRepository)
        const surveysUsersRepository = getCustomRepository(SurveysUsersRepository)

        const user = await usersRepository.findOne({
            email
        })

        console.log(survey_id)

        if(!user) {
            throw new AppError("User does not exists")
        }

        const survey = await surveysRepository.findOne({ id: survey_id })

        if(!survey) {
            throw new AppError("Survey does not exists")
        }

        const npsPath = resolve(__dirname, "..", "views", "emails", "npsMail.hbs")

        
        const surveyUsersAlreadyExists = await surveysUsersRepository.findOne({
            where: { user_id: user.id, value: null },
            relations: ["user", "survey"]
        })
        
        const variables = {
            name: user.name,
            title: survey.title,
            description: survey.description,
            id: "",
            link: process.env.URL_MAIL
        }

        if(surveyUsersAlreadyExists){
            variables.id = surveyUsersAlreadyExists.id
            await SendMailService.execute(email, survey.title, variables, npsPath)
            return response.json(surveyUsersAlreadyExists)
        }
        

        const surveyUser = surveysUsersRepository.create({
            user_id: user.id,
            survey_id
        })


        await surveysUsersRepository.save(surveyUser)

        variables.id = surveyUser.id

        await SendMailService.execute(email, survey.title, variables, npsPath)

        return response.status(200).json(surveyUser)
    } 
}

export { SendMailController }