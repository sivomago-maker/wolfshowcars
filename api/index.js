require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const express = require("express");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(express.json());

// =====================================================
// CONFIGURACIÃ“N
// =====================================================

const ROOT = process.cwd();

const PORT = process.env.PORT || 3000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;

const URL_SITIO = "https://wolfshowcars.onrender.com";

// =====================================================
// VERIFICAR CONFIGURACIÃ“N
// =====================================================

if (!SUPABASE_URL) {
    console.error("âŒ ERROR: SUPABASE_URL no estÃ¡ configurado.");
}

if (!SUPABASE_KEY) {
    console.error("âŒ ERROR: SUPABASE_KEY no estÃ¡ configurado.");
}

if (!MP_ACCESS_TOKEN) {
    console.error("âŒ ERROR: MP_ACCESS_TOKEN no estÃ¡ configurado.");
}

// =====================================================
// SUPABASE
// =====================================================

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// =====================================================
// ARCHIVOS DEL SITIO
// =====================================================

app.use(express.static(ROOT));

// =====================================================
// PÃGINA PRINCIPAL
// =====================================================

app.get("/", function (req, res) {

    res.sendFile(
        path.join(ROOT, "index.html")
    );

});

// =====================================================
// PÃGINA PAGO EXITOSO
// =====================================================

app.get("/pago-exitoso.html", function (req, res) {

    res.sendFile(
        path.join(ROOT, "pago-exitoso.html")
    );

});

// =====================================================
// API â€” ESTADO
// =====================================================

app.get("/api/estado", function (req, res) {

    res.json({

        ok: true,

        servidor: "WOLF SHOWCARS",

        estado: "FUNCIONANDO",

        fecha: new Date().toISOString()

    });

});

// =====================================================
// GENERAR NÃšMERO DE ACREDITACIÃ“N
// =====================================================

function generarNumeroAcreditacion() {

    return "WSC27-" +
        Math.floor(
            100000 +
            Math.random() * 900000
        );

}

// =====================================================
// GENERAR CÃ“DIGO DE SEGURIDAD
// =====================================================

function generarCodigoSeguridad() {

    const caracteres =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let codigo = "";

    for (let i = 0; i < 10; i++) {

        codigo += caracteres.charAt(
            Math.floor(
                Math.random() *
                caracteres.length
            )
        );

    }

    return codigo;

}

// =====================================================
// API â€” CREAR ACREDITACIÃ“N
// =====================================================

app.post(
    "/api/acreditaciones",
    async function (req, res) {

        try {

            const datos = req.body || {};

            console.log(
                "=========================================="
            );

            console.log(
                "NUEVA SOLICITUD DE ACREDITACIÃ“N"
            );

            console.log(
                datos
            );

            // =================================================
            // CAMPOS OBLIGATORIOS
            // =================================================

            const camposObligatorios = [

                "nombre",
                "dni",
                "telefono",
                "instagram",
                "marca",
                "modelo",
                "anio",
                "patente"

            ];

            for (
                const campo
                of camposObligatorios
            ) {

                if (
                    !datos[campo] ||
                    String(
                        datos[campo]
                    ).trim() === ""
                ) {

                    return res.status(400).json({

                        ok: false,

                        mensaje:
                            "Falta completar el campo: " +
                            campo

                    });

                }

            }

            // =================================================
            // ACOMPAÃ‘ANTES
            // =================================================

            const acompanantes =
                Number(
                    datos.acompanantes || 0
                );

            if (
                !Number.isInteger(
                    acompanantes
                ) ||
                acompanantes < 0
            ) {

                return res.status(400).json({

                    ok: false,

                    mensaje:
                        "La cantidad de acompaÃ±antes no es vÃ¡lida."

                });

            }

            // =================================================
            // PRECIOS
            // =================================================

            const precioAuto = 12000;

            const precioAcompanante = 3000;

            const total =
                precioAuto +
                (
                    acompanantes *
                    precioAcompanante
                );

            // =================================================
            // IDENTIFICADORES
            // =================================================

            const numeroAcreditacion =
                generarNumeroAcreditacion();

            const codigoSeguridad =
                generarCodigoSeguridad();

            // =================================================
            // LIMPIAR DATOS
            // =================================================

            const nombre =
                String(
                    datos.nombre
                ).trim();

            const dni =
                String(
                    datos.dni
                ).trim();

            const telefono =
                String(
                    datos.telefono
                ).trim();

            const instagram =
                String(
                    datos.instagram
                ).trim();

            const marca =
                String(
                    datos.marca
                ).trim();

            const modelo =
                String(
                    datos.modelo
                ).trim();

            const anio =
                String(
                    datos.anio
                ).trim();

            const patente =
                String(
                    datos.patente
                )
                    .trim()
                    .toUpperCase();

            // =================================================
            // GUARDAR EN SUPABASE
            // =================================================

            const {
                data,
                error
            } =
                await supabase
                    .from("acreditaciones")
                    .insert([{

                        numero_acreditacion:
                            numeroAcreditacion,

                        codigo_seguridad:
                            codigoSeguridad,

                        nombre,

                        dni,

                        telefono,

                        instagram,

                        marca,

                        modelo,

                        anio,

                        patente,

                        acompanantes,

                        precio_auto:
                            precioAuto,

                        precio_acompanante:
                            precioAcompanante,

                        total,

                        estado:
                            "PENDIENTE_PAGO"

                    }])
                    .select()
                    .single();

            // =================================================
            // ERROR SUPABASE
            // =================================================

            if (error) {

                console.error(
                    "âŒ ERROR SUPABASE:",
                    error
                );

                return res.status(500).json({

                    ok: false,

                    mensaje:
                        "No se pudo guardar la acreditaciÃ³n en la base de datos.",

                    error:
                        error.message

                });

            }

            // =================================================
            // VERIFICAR MERCADO PAGO
            // =================================================

            if (!MP_ACCESS_TOKEN) {

                console.error(
                    "âŒ MP_ACCESS_TOKEN no estÃ¡ configurado."
                );

                return res.status(500).json({

                    ok: false,

                    mensaje:
                        "Mercado Pago no estÃ¡ configurado correctamente."

                });

            }

            // =================================================
            // CREAR PREFERENCIA MERCADO PAGO
            // =================================================

            const preferencia = {

                items: [{

                    id:
                        numeroAcreditacion,

                    title:
                        "AcreditaciÃ³n WOLF SHOWCARS 2027",

                    description:
                        "Ingreso de vehÃ­culo + " +
                        acompanantes +
                        " acompaÃ±ante(s)",

                    quantity: 1,

                    currency_id:
                        "ARS",

                    unit_price:
                        total

                }],

                external_reference:
                    numeroAcreditacion,

                back_urls: {

                    success:
                        URL_SITIO +
                        "/pago-exitoso.html",

                    failure:
                        URL_SITIO +
                        "/?pago=fallido",

                    pending:
                        URL_SITIO +
                        "/?pago=pendiente"

                },

                auto_return:
                    "approved",

                notification_url:
                    URL_SITIO +
                    "/api/mercadopago/webhook"

            };

            console.log(
                "CREANDO PREFERENCIA MERCADO PAGO..."
            );

            // =================================================
            // SOLICITAR PREFERENCIA
            // =================================================

            const respuestaMercadoPago =
                await fetch(
                    "https://api.mercadopago.com/checkout/preferences",
                    {

                        method:
                            "POST",

                        headers: {

                            "Content-Type":
                                "application/json",

                            "Authorization":
                                "Bearer " +
                                MP_ACCESS_TOKEN

                        },

                        body:
                            JSON.stringify(
                                preferencia
                            )

                    }
                );

            const resultadoMercadoPago =
                await respuestaMercadoPago.json();

            // =================================================
            // ERROR MERCADO PAGO
            // =================================================

            if (
                !respuestaMercadoPago.ok
            ) {

                console.error(
                    "âŒ ERROR MERCADO PAGO:",
                    resultadoMercadoPago
                );

                return res.status(500).json({

                    ok: false,

                    mensaje:
                        "No se pudo generar el pago de Mercado Pago.",

                    error:
                        resultadoMercadoPago

                });

            }

            // =================================================
            // VERIFICAR PREFERENCIA
            // =================================================

            if (
                !resultadoMercadoPago.id ||
                !resultadoMercadoPago.init_point
            ) {

                console.error(
                    "âŒ Mercado Pago no devolviÃ³ correctamente la preferencia:",
                    resultadoMercadoPago
                );

                return res.status(500).json({

                    ok: false,

                    mensaje:
                        "Mercado Pago no devolviÃ³ correctamente el enlace de pago."

                });

            }

            // =================================================
            // RESPUESTA
            // =================================================

            console.log(
                "=========================================="
            );

            console.log(
                "âœ… ACREDITACIÃ“N CREADA:",
                numeroAcreditacion
            );

            console.log(
                "PREFERENCIA MERCADO PAGO:",
                resultadoMercadoPago.id
            );

            console.log(
                "TOTAL:",
                total
            );

            console.log(
                "=========================================="
            );

            return res.status(201).json({

                ok: true,

                mensaje:
                    "AcreditaciÃ³n creada correctamente.",

                acreditacion: {

                    id:
                        data.id,

                    numeroAcreditacion,

                    codigoSeguridad,

                    datos: {

                        nombre,

                        dni,

                        telefono,

                        instagram,

                        marca,

                        modelo,

                        anio,

                        patente,

                        acompanantes

                    },

                    precioAuto,

                    precioAcompanante,

                    total,

                    estado:
                        "PENDIENTE_PAGO"

                },

                mercadoPago: {

                    preferenceId:
                        resultadoMercadoPago.id,

                    initPoint:
                        resultadoMercadoPago.init_point,

                    sandboxInitPoint:
                        resultadoMercadoPago.sandbox_init_point

                }

            });

        } catch (error) {

            console.error(
                "=========================================="
            );

            console.error(
                "âŒ ERROR GENERAL:"
            );

            console.error(
                error
            );

            console.error(
                "=========================================="
            );

            return res.status(500).json({

                ok: false,

                mensaje:
                    "OcurriÃ³ un error interno en el servidor.",

                error:
                    error.message

            });

        }

    }

);

// =====================================================
// WEBHOOK DE MERCADO PAGO
// =====================================================

app.post(
    "/api/mercadopago/webhook",
    async function (req, res) {

        try {

            console.log(
                "=========================================="
            );

            console.log(
                "WEBHOOK MERCADO PAGO"
            );

            console.log(
                JSON.stringify(
                    req.body,
                    null,
                    2
                )
            );

            let paymentId = null;

            // =================================================
            // OBTENER PAYMENT ID DESDE DATA.ID
            // =================================================

            if (
                req.body &&
                req.body.data &&
                req.body.data.id
            ) {

                paymentId =
                    String(
                        req.body.data.id
                    );

            }

            // =================================================
            // COMPATIBILIDAD CON ?id=
            // =================================================

            if (
                !paymentId &&
                req.query &&
                req.query.id
            ) {

                paymentId =
                    String(
                        req.query.id
                    );

            }

            // =================================================
            // COMPATIBILIDAD CON ?data.id=
            // =================================================

            if (
                !paymentId &&
                req.query &&
                req.query["data.id"]
            ) {

                paymentId =
                    String(
                        req.query["data.id"]
                    );

            }

            // =================================================
            // SI NO HAY PAYMENT ID
            // =================================================

            if (!paymentId) {

                console.log(
                    "Webhook sin payment ID."
                );

                return res.sendStatus(200);

            }

            // =================================================
            // VERIFICAR TOKEN
            // =================================================

            if (!MP_ACCESS_TOKEN) {

                console.error(
                    "MP_ACCESS_TOKEN no configurado."
                );

                return res.sendStatus(200);

            }

            // =================================================
            // CONSULTAR PAGO EN MERCADO PAGO
            // =================================================

            console.log(
                "Consultando pago:",
                paymentId
            );

            const respuestaPago =
                await fetch(

                    "https://api.mercadopago.com/v1/payments/" +
                    paymentId,

                    {

                        method:
                            "GET",

                        headers: {

                            "Authorization":
                                "Bearer " +
                                MP_ACCESS_TOKEN

                        }

                    }

                );

            const pago =
                await respuestaPago.json();

            // =================================================
            // ERROR CONSULTANDO PAGO
            // =================================================

            if (
                !respuestaPago.ok
            ) {

                console.error(
                    "âŒ ERROR CONSULTANDO PAGO:",
                    pago
                );

                return res.sendStatus(200);

            }

            console.log(
                "PAGO RECIBIDO:",
                pago
            );

            // =================================================
            // OBTENER ACREDITACIÃ“N
            // =================================================

            const numeroAcreditacion =
                pago.external_reference;

            if (!numeroAcreditacion) {

                console.error(
                    "âŒ El pago no tiene external_reference."
                );

                return res.sendStatus(200);

            }

            // =================================================
            // DETERMINAR ESTADO
            // =================================================

            let nuevoEstado =
                "PENDIENTE_PAGO";

            if (
                pago.status === "approved"
            ) {

                nuevoEstado =
                    "PAGADO";

            }

            else if (
                pago.status === "rejected"
            ) {

                nuevoEstado =
                    "PAGO_RECHAZADO";

            }

            else if (
                pago.status === "cancelled"
            ) {

                nuevoEstado =
                    "PAGO_CANCELADO";

            }

            else if (
                pago.status === "refunded"
            ) {

                nuevoEstado =
                    "DEVUELTO";

            }

            else if (
                pago.status === "charged_back"
            ) {

                nuevoEstado =
                    "CONTRACARGO";

            }

            else if (
                pago.status === "in_process"
            ) {

                nuevoEstado =
                    "PAGO_EN_PROCESO";

            }

            else if (
                pago.status === "pending"
            ) {

                nuevoEstado =
                    "PENDIENTE_PAGO";

            }

            // =================================================
            // ACTUALIZAR SUPABASE
            // =================================================

            const {
                error
            } =
                await supabase
                    .from("acreditaciones")
                    .update({

                        estado:
                            nuevoEstado,

                        mercado_pago_payment_id:
                            paymentId

                    })
                    .eq(
                        "numero_acreditacion",
                        numeroAcreditacion
                    );

            // =================================================
            // ERROR SUPABASE
            // =================================================

            if (error) {

                console.error(
                    "âŒ ERROR ACTUALIZANDO SUPABASE:",
                    error
                );

                return res.sendStatus(200);

            }

            // =================================================
            // LOG FINAL
            // =================================================

            console.log(
                "=========================================="
            );

            console.log(
                "âœ… ACREDITACIÃ“N ACTUALIZADA:",
                numeroAcreditacion
            );

            console.log(
                "PAYMENT ID:",
                paymentId
            );

            console.log(
                "ESTADO:",
                nuevoEstado
            );

            console.log(
                "=========================================="
            );

            return res.sendStatus(200);

        } catch (error) {

            console.error(
                "=========================================="
            );

            console.error(
                "âŒ ERROR WEBHOOK:"
            );

            console.error(
                error
            );

            console.error(
                "=========================================="
            );

            // Mercado Pago debe recibir 200
            // para evitar reintentos innecesarios.

            return res.sendStatus(200);

        }

    }

);

// =====================================================
// INICIAR SERVIDOR
// =====================================================

app.listen(
    PORT,
    function () {

        console.log(
            "=========================================="
        );

        console.log(
            "WOLF SHOWCARS â€” SERVIDOR"
        );

        console.log(
            "=========================================="
        );

        console.log(
            "Servidor funcionando en puerto:"
        );

        console.log(
            PORT
        );

        console.log(
            "Supabase:"
        );

        console.log(
            SUPABASE_URL
                ? "CONFIGURADO"
                : "NO CONFIGURADO"
        );

        console.log(
            "Mercado Pago:"
        );

        console.log(
            MP_ACCESS_TOKEN
                ? "CONFIGURADO"
                : "NO CONFIGURADO"
        );

        console.log(
            "Directorio raÃ­z:"
        );

        console.log(
            ROOT
        );

        console.log(
            "=========================================="
        );

    }
);

